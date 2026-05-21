import { spawn } from "node:child_process"
import path from "node:path"

const processes = []

function run(name, command, cwd) {
  const absoluteCwd = path.resolve(process.cwd(), cwd)

  const child =
    process.platform === "win32"
      ? spawn("cmd.exe", ["/d", "/s", "/c", command], {
          cwd: absoluteCwd,
          stdio: "inherit",
          env: process.env,
        })
      : spawn(command, {
          cwd: absoluteCwd,
          stdio: "inherit",
          env: process.env,
          shell: true,
        })

  child.on("exit", (code) => {
    if (code !== 0) {
      console.error(`[${name}] exited with code ${code}`)
      shutdown(code ?? 1)
    }
  })

  processes.push(child)
}

function shutdown(code = 0) {
  for (const child of processes) {
    if (!child.killed) {
      child.kill("SIGTERM")
    }
  }
  process.exit(code)
}

process.on("SIGINT", () => shutdown(0))
process.on("SIGTERM", () => shutdown(0))

run("backend", "npm run dev", "backend")
run("frontend", "npm run dev", "frontend")
