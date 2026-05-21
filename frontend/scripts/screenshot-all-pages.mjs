import { spawn } from "node:child_process"
import { promises as fs } from "node:fs"
import path from "node:path"
import process from "node:process"
import { chromium } from "playwright"

const projectRoot = process.cwd()
const appDir = path.join(projectRoot, "app")
const outputRoot = path.join(projectRoot, "screenshots")
const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
const outputDir = path.join(outputRoot, timestamp)
const baseUrl = process.env.SCREENSHOT_BASE_URL || "http://localhost:3000"
const port = process.env.SCREENSHOT_PORT || "3000"
const apiBaseUrl = process.env.SCREENSHOT_API_BASE_URL || "http://localhost:5000/api"
const skipDynamic = (process.env.SCREENSHOT_INCLUDE_DYNAMIC || "false") !== "true"
const navTimeoutMs = Number(process.env.SCREENSHOT_TIMEOUT_MS || "45000")
const captureInteractions = (process.env.SCREENSHOT_CAPTURE_INTERACTIONS || "true") === "true"

const authProfiles = {
  admin: {
    username: process.env.SCREENSHOT_ADMIN_USER || "admin",
    password: process.env.SCREENSHOT_ADMIN_PASS || "admin123",
    home: "/admin",
  },
  employee: {
    username: process.env.SCREENSHOT_EMPLOYEE_USER || "nhanvien1",
    password: process.env.SCREENSHOT_EMPLOYEE_PASS || "nhanvien123",
    home: "/employee",
  },
  hub: {
    username: process.env.SCREENSHOT_HUB_USER || "nvhub",
    password: process.env.SCREENSHOT_HUB_PASS || "nhanvien123",
    home: "/hub",
  },
  user: {
    username: process.env.SCREENSHOT_USER_USER || "",
    password: process.env.SCREENSHOT_USER_PASS || "",
    home: "/my-bookings",
  },
}

function slugifyText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/")
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const results = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...(await walk(fullPath)))
      continue
    }

    if (entry.isFile() && entry.name === "page.tsx") {
      results.push(fullPath)
    }
  }

  return results
}

function routeFromPagePath(pagePath) {
  const relative = toPosixPath(path.relative(appDir, pagePath))
  if (relative === "page.tsx") return "/"
  const withoutFile = relative.replace(/\/page\.tsx$/, "")
  if (!withoutFile) return "/"

  const segments = withoutFile
    .split("/")
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))

  if (segments.length === 0) return "/"

  return `/${segments.join("/")}`
}

function hasDynamicSegment(route) {
  return route.includes("[") || route.includes("]")
}

function screenshotFileName(route) {
  if (route === "/") return "index.png"
  const safe = route
    .replace(/^\//, "")
    .replace(/\//g, "__")
    .replace(/[^a-zA-Z0-9_\-]/g, "_")
  return `${safe}.png`
}

function screenshotFileBase(route) {
  return screenshotFileName(route).replace(/\.png$/, "")
}

async function waitForServerReady(url, timeoutMs = 120000) {
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" })
      if (response.status >= 200 && response.status < 500) {
        return true
      }
    } catch {
      // ignore until timeout
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return false
}

async function startNextDevServer() {
  const alreadyRunning = await waitForServerReady(baseUrl, 3000)
  if (alreadyRunning) {
    console.log(`Dùng server có sẵn tại ${baseUrl}`)
    return null
  }

  const nextBinPath = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next")
  const child = spawn(process.execPath, [nextBinPath, "dev", "--port", port], {
    cwd: projectRoot,
    stdio: "pipe",
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  })

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[next] ${chunk}`)
  })
  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[next] ${chunk}`)
  })

  const ready = await waitForServerReady(baseUrl)
  if (!ready) {
    child.kill("SIGTERM")
    throw new Error(`Không thể khởi động Next.js tại ${baseUrl}`)
  }

  return child
}

async function ensureUserCredentials() {
  if (authProfiles.user.username && authProfiles.user.password) {
    return authProfiles.user
  }

  const stamp = Date.now().toString().slice(-8)
  const username = `shotuser_${stamp}`
  const password = `Shot@${stamp}`
  const email = `${username}@example.com`
  const phone = `09${stamp.padStart(8, "0")}`.slice(0, 10)

  const response = await fetch(`${apiBaseUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      password,
      full_name: `Screenshot User ${stamp}`,
      email,
      phone,
      address: "Hà Nội",
    }),
  })

  const json = await response.json().catch(() => ({}))
  if (!response.ok || !json.success) {
    throw new Error(`Không tạo được user chụp ảnh: ${json.message || response.statusText}`)
  }

  authProfiles.user.username = username
  authProfiles.user.password = password
  return authProfiles.user
}

function getProfileForRoute(route) {
  if (route === "/login" || route === "/register" || route === "/forgot-password") return "anonymous"
  if (route.startsWith("/admin")) return "admin"
  if (route.startsWith("/hub")) return "hub"
  if (route.startsWith("/employee")) return "employee"
  if (route.startsWith("/my-bookings")) return "user"
  if (route.startsWith("/booking")) return "user"
  if (route.startsWith("/shop/checkout")) return "user"
  if (route.startsWith("/shop/order-success")) return "user"
  return "anonymous"
}

async function ensureLoggedInPage(browser, pageByProfile, profileName) {
  if (pageByProfile.has(profileName)) return pageByProfile.get(profileName)

  const profile = authProfiles[profileName]
  if (!profile) throw new Error(`Không tìm thấy profile đăng nhập: ${profileName}`)

  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
  const page = await context.newPage()

  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: navTimeoutMs })
  await page.waitForSelector("#username", { timeout: 15000 })
  await page.fill("#username", profile.username)
  await page.fill("#password", profile.password)
  await page.click('button[type="submit"]')

  await Promise.race([
    page.waitForFunction(() => Boolean(localStorage.getItem("bh_token")), null, { timeout: 20000 }),
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 }),
  ]).catch(() => null)

  const token = await page.evaluate(() => localStorage.getItem("bh_token"))
  if (!token) {
    const uiError = await page.locator(".bg-red-50.text-red-500").first().textContent().catch(() => null)
    throw new Error(`Đăng nhập ${profileName} thất bại${uiError ? `: ${uiError.trim()}` : ""}`)
  }

  await page.goto(`${baseUrl}${profile.home}`, { waitUntil: "domcontentloaded", timeout: navTimeoutMs })

  pageByProfile.set(profileName, page)
  return page
}

async function captureExtraInteractions(page, route, outputDirPath, report, profile) {
  if (!captureInteractions) return

  const baseName = screenshotFileBase(route)

  const tabLocator = page.locator('[role="tab"]')
  const tabCount = Math.min(await tabLocator.count(), 5)
  for (let index = 0; index < tabCount; index++) {
    try {
      const tab = tabLocator.nth(index)
      const labelRaw = (await tab.textContent()) || `tab-${index + 1}`
      const label = slugifyText(labelRaw) || `tab-${index + 1}`
      await tab.click({ timeout: 5000 })
      await page.waitForTimeout(600)

      const fileName = `${baseName}__tab-${index + 1}-${label}.png`
      const filePath = path.join(outputDirPath, fileName)
      await page.screenshot({ path: filePath, fullPage: true })

      report.push({
        route,
        profile,
        interaction: `tab:${labelRaw.trim()}`,
        file: path.relative(projectRoot, filePath),
        ok: true,
      })

      console.log(`   ↳ tab ${index + 1}: ${fileName}`)
    } catch {
      // keep run resilient
    }
  }

  if (route === "/shop") {
    try {
      const firstCard = page.locator('div.group.overflow-hidden').first()
      await firstCard.click({ timeout: 5000 })
      await page.waitForSelector('[role="dialog"]', { timeout: 8000 })
      await page.waitForTimeout(500)

      const fileName = `${baseName}__product-dialog.png`
      const filePath = path.join(outputDirPath, fileName)
      await page.screenshot({ path: filePath, fullPage: true })

      report.push({
        route,
        profile,
        interaction: "shop:product-dialog",
        file: path.relative(projectRoot, filePath),
        ok: true,
      })

      await page.keyboard.press("Escape")
      await page.waitForTimeout(300)
      console.log(`   ↳ shop dialog: ${fileName}`)
    } catch {
      // optional interaction
    }
  }
}

async function ensureAnonymousPage(browser, pageByProfile) {
  if (pageByProfile.has("anonymous")) return pageByProfile.get("anonymous")
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
  const page = await context.newPage()
  pageByProfile.set("anonymous", page)
  return page
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true })

  const pageFiles = await walk(appDir)
  const allRoutes = pageFiles.map(routeFromPagePath)

  const skipped = []
  const routes = allRoutes
    .filter((route) => {
      if (skipDynamic && hasDynamicSegment(route)) {
        skipped.push(route)
        return false
      }
      return true
    })
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .sort()

  console.log(`Tìm thấy ${routes.length} route để chụp.`)
  if (skipped.length > 0) {
    console.log(`Bỏ qua ${skipped.length} route động: ${skipped.join(", ")}`)
  }

  const server = await startNextDevServer()
  await ensureUserCredentials()
  const browser = await chromium.launch({ headless: true })
  const pageByProfile = new Map()

  const report = []

  try {
    for (const route of routes) {
      const url = `${baseUrl}${route}`
      const fileName = screenshotFileName(route)
      const filePath = path.join(outputDir, fileName)
      const profile = getProfileForRoute(route)

      try {
        const page = profile === "anonymous"
          ? await ensureAnonymousPage(browser, pageByProfile)
          : await ensureLoggedInPage(browser, pageByProfile, profile)

        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: navTimeoutMs,
        })

        await page.waitForTimeout(1200)
        await page.screenshot({ path: filePath, fullPage: true })

        report.push({
          route,
          url,
          profile,
          status: response?.status() ?? null,
          file: path.relative(projectRoot, filePath),
          ok: true,
        })

        console.log(`✅ ${route} -> ${fileName}`)

        await captureExtraInteractions(page, route, outputDir, report, profile)
      } catch (error) {
        report.push({
          route,
          url,
          profile,
          status: null,
          file: null,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        })

        console.error(`❌ ${route} -> ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  } finally {
    for (const page of pageByProfile.values()) {
      await page.context().close()
    }
    await browser.close()
    if (server) {
      server.kill("SIGTERM")
    }
  }

  const reportPath = path.join(outputDir, "report.json")
  await fs.writeFile(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, routes, skipped, report }, null, 2), "utf-8")

  const successCount = report.filter((item) => item.ok).length
  const failCount = report.length - successCount

  console.log("------------------------------------")
  console.log(`Đã xuất ảnh vào: ${path.relative(projectRoot, outputDir)}`)
  console.log(`Thành công: ${successCount}`)
  console.log(`Thất bại: ${failCount}`)
  console.log(`Báo cáo: ${path.relative(projectRoot, reportPath)}`)

  if (failCount > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
