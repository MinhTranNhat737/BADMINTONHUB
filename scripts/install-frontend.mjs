import { existsSync } from "node:fs"
import { spawnSync } from "node:child_process"
import path from "node:path"

const frontendDir = path.resolve(process.cwd(), "frontend")
const pnpmLock = path.join(frontendDir, "pnpm-lock.yaml")
const packageLock = path.join(frontendDir, "package-lock.json")

const hasPnpmLock = existsSync(pnpmLock)
const hasPackageLock = existsSync(packageLock)

if (hasPnpmLock && hasPackageLock) {
  console.error("frontend đang có cả pnpm-lock.yaml và package-lock.json.")
  console.error("Hãy dùng duy nhất 1 package manager, rồi cài lại sạch node_modules.")
  console.error("Khuyến nghị cho thư mục này:")
  console.error("1. Xóa frontend\\node_modules")
  console.error("2. Xóa package-lock.json hoặc pnpm-lock.yaml")
  console.error("3. Cài lại dependency")
  console.error("   - npm install   (nếu giữ package-lock.json)")
  console.error("   - pnpm install  (nếu giữ pnpm-lock.yaml)")
  process.exit(1)
}

const usePnpm = hasPnpmLock
const command = process.platform === "win32" ? "cmd.exe" : usePnpm ? "pnpm" : "npm"
const args =
  process.platform === "win32"
    ? ["/d", "/s", "/c", usePnpm ? "pnpm install" : "npm install"]
    : ["install"]

const result = spawnSync(command, args, {
  cwd: frontendDir,
  stdio: "inherit",
  env: process.env,
})

process.exit(result.status ?? 1)
