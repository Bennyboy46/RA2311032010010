const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJkYjMwMzNAc3JtaXN0LmVkdS5pbiIsImV4cCI6MTc3NzcwMTYzNiwiaWF0IjoxNzc3NzAwNzM2LCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiYWU4ZWQ1OGEtZGVlMy00ZDk3LTgxZjAtYzkwZjQ0M2Q2OGRiIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoiZGFyc2hhbiBiZW5lZGljdCIsInN1YiI6ImM0MDgyNmFlLWNiYWUtNDYxZC1hMmExLWJmYTMyMGJjNzA2ZiJ9LCJlbWFpbCI6ImRiMzAzM0Bzcm1pc3QuZWR1LmluIiwibmFtZSI6ImRhcnNoYW4gYmVuZWRpY3QiLCJyb2xsTm8iOiJyYTIzMTEwMzIwMTAwMTAiLCJhY2Nlc3NDb2RlIjoiUWticHhIIiwiY2xpZW50SUQiOiJjNDA4MjZhZS1jYmFlLTQ2MWQtYTJhMS1iZmEzMjBiYzcwNmYiLCJjbGllbnRTZWNyZXQiOiJRZE5mU0t2ZG5kd3dVYkRQIn0.8Nrbk2upTgHCPKkyfZitPL2--qsjEifpIoAILARbmzM";

const HEADERS = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${TOKEN}`
};

async function fetchDepots() {
  const res = await fetch("http://20.207.122.201/evaluation-service/depots", { headers: HEADERS });
  const data = await res.json();
  return data.depots;
}

async function fetchVehicles() {
  const res = await fetch("http://20.207.122.201/evaluation-service/vehicles", { headers: HEADERS });
  const data = await res.json();
  return data.vehicles;
}

function knapsack(vehicles, maxHours) {
  const n=vehicles.length;
  const dp=Array(n+1).fill(null).map(() =>Array(maxHours+1).fill(0));
  for (let i = 1; i <= n; i++){
    const {Duration,Impact} =vehicles[i-1];
    for (let h=0;h<=maxHours;h++) {
      dp[i][h]=dp[i-1][h];
      if (Duration <= h) {
        dp[i][h]=Math.max(dp[i][h],dp[i-1][h-Duration]+Impact);
      }
    }
  }

  const selected = [];
  let h=maxHours;
  for (let i= n; i>=1;i--) {
    if (dp[i][h]!==dp[i-1][h]) {
      selected.push(vehicles[i-1]);
      h -= vehicles[i-1].Duration;
    }
  }

  return { totalImpact: dp[n][maxHours], selected };
}

async function main() {
  console.log("Fetching depots and vehicles please wait\n");

  const [depots, vehicles] = await Promise.all([fetchDepots(), fetchVehicles()]);

  console.log(`Found ${depots.length} depots and ${vehicles.length} vehicles\n`);

  for (const depot of depots) {
    const { ID, MechanicHours } = depot;
    const { totalImpact, selected } = knapsack(vehicles, MechanicHours);

    console.log(`Depot ${ID} | Budget: ${MechanicHours} hours`);
    console.log(`  Total Impact Score : ${totalImpact}`);
    console.log(`  Vehicles Selected  : ${selected.length}`);
    console.log(`  Hours Used         : ${selected.reduce((sum, v) => sum + v.Duration, 0)}`);
    selected.forEach(v => {
      console.log(`    - TaskID: ${v.TaskID} | Duration: ${v.Duration}h | Impact: ${v.Impact}`);
    });
    console.log();
  }
}

main().catch(console.error);