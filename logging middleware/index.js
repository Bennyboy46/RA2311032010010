const LOG_API_URL = "http://20.207.122.201/evaluation-service/logs";
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJkYjMwMzNAc3JtaXN0LmVkdS5pbiIsImV4cCI6MTc3NzcwMTYzNiwiaWF0IjoxNzc3NzAwNzM2LCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiYWU4ZWQ1OGEtZGVlMy00ZDk3LTgxZjAtYzkwZjQ0M2Q2OGRiIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoiZGFyc2hhbiBiZW5lZGljdCIsInN1YiI6ImM0MDgyNmFlLWNiYWUtNDYxZC1hMmExLWJmYTMyMGJjNzA2ZiJ9LCJlbWFpbCI6ImRiMzAzM0Bzcm1pc3QuZWR1LmluIiwibmFtZSI6ImRhcnNoYW4gYmVuZWRpY3QiLCJyb2xsTm8iOiJyYTIzMTEwMzIwMTAwMTAiLCJhY2Nlc3NDb2RlIjoiUWticHhIIiwiY2xpZW50SUQiOiJjNDA4MjZhZS1jYmFlLTQ2MWQtYTJhMS1iZmEzMjBiYzcwNmYiLCJjbGllbnRTZWNyZXQiOiJRZE5mU0t2ZG5kd3dVYkRQIn0.8Nrbk2upTgHCPKkyfZitPL2--qsjEifpIoAILARbmzM";

async function Log(stack, level, pkg, message) {
  const validStacks = ["backend", "frontend"];
  const validLevels = ["debug", "info", "warn", "error", "fatal"];
  const validPackages = [
    "cache", "controller", "cron_job", "db", "domain",
    "handler", "repository", "route", "service",
    "api", "component", "hook", "page", "state", "style",
    "auth", "config", "middleware", "utils"
  ];

  if (!validStacks.includes(stack)) return console.error(`Invalid stack: ${stack}`);
  if (!validLevels.includes(level)) return console.error(`Invalid level: ${level}`);
  if (!validPackages.includes(pkg)) return console.error(`Invalid package: ${pkg}`);
  if (!message) return console.error("Message cannot be empty");

  try {
    const response = await fetch(LOG_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TOKEN}`
      },
      body: JSON.stringify({ stack, level, package: pkg, message }),
    });
    const data = await response.json();
    console.log("Log sent:", data);
    return data;
  } catch (error) {
    console.error("Failed to send log:", error);
    return null;
  }
}

module.exports = { Log };