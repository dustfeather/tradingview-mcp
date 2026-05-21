---
name: tradingview-devtools-launch
description: |
  Launch TradingView Desktop with Chrome DevTools Protocol (CDP) enabled on Windows. 
  Use when: (1) Remote debugging is not enabled, (2) TradingView fails to connect via MCP, 
  (3) You need to attach Chrome DevTools to TradingView for debugging. Works on Windows 
  host from WSL by launching the Windows .exe directly.
author: Claude Code
version: 1.0.0
date: 2026-05-21
---

# TradingView DevTools Launch (Windows from WSL)

## Problem
TradingView Desktop does not have remote debugging enabled by default. The MCP tools 
(`mcp__tradingview__tv_launch`, etc.) require CDP access on port 9222. On Windows, 
TradingView must be launched with the `--remote-debugging-port=9222` flag from a 
Windows command prompt, then accessed via Chrome's `chrome://inspect`.

## Context / Trigger Conditions
- MCP tools return `CDP connection failed` or `TradingView not found`
- Strategy Tester shows no trades when running a converted strategy
- Need to debug Pine Script compilation or execution in real-time
- `tv_health_check` returns connection errors
- You're on Windows WSL but need to launch the Windows host's TradingView.exe

## Solution (From Windows Command Prompt)
**Run these steps inside Windows (cmd or PowerShell), NOT from WSL:**

1. Locate TradingView executable:
   - Default: `C:\Program Files\TradingView\TradingView.exe`
   - Alternative: `C:\Users\<user>\AppData\Local\TradingView\` or search for `TradingView.exe` in File Explorer

2. Launch with remote debugging:
   ```cmd
   "C:\Path\To\TradingView\TradingView.exe" --remote-debugging-port=9222
   ```

3. Verify CDP is listening (in Chrome on Windows):
   - Open `chrome://inspect`
   - Click "Configure..." → ensure `localhost:9222` is listed
   - Click "Discover network targets"
   - TradingView should appear under "Remote Target"

4. Use MCP tools (from WSL or Windows):
   - `chart_get_state` → verify connection
   - `pine_smart_compile` → compile your strategy
   - All MCP commands now work (CDP is active)

## Alternative: Use Windows Batch Script

Create `launch_tradingview.bat` for convenience:
```cmd
@echo off
cd /d "C:\Program Files\TradingView"
start TradingView.exe --remote-debugging-port=9222
```
Run the batch file to start TradingView with DevTools enabled.

## Verification
- `mcp__tradingview__quote_get` returns current price without errors
- `mcp__tradingview__chart_get_state` returns symbol, timeframe, indicators
- Pine Script compiles successfully with `pine_smart_compile`
- Chrome `chrome://inspect` shows TradingView as a connected target

## Notes
- TradingView.exe must be launched from Windows, not WSL (GUI apps require Windows desktop)
- If launch fails, check: path is correct, no spaces in path without quotes, port 9222 is free
- Close any existing TradingView instances before launching with --remote-debugging-port
- The CDP port must match what your MCP server expects (default: 9222)
- Some antivirus/firewall may block the remote debugging connection - add an exception if needed

## References
- [TradingView MCP Documentation](https://github.com/TradingView/MCP)
- [Chrome DevTools Protocol Documentation](https://chromedevtools.github.io/devtools-protocol/)
- [Pine Script Strategy Conversion](skill:pine-indicator-to-strategy-conversion)