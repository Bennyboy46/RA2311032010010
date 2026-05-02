const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJkYjMwMzNAc3JtaXN0LmVkdS5pbiIsImV4cCI6MTc3NzcwMzQ4NSwiaWF0IjoxNzc3NzAyNTg1LCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiM2E1M2IwYjktOTZhMy00NWRjLTk1NWEtYWZmYTkwY2Y1YmFiIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoiZGFyc2hhbiBiZW5lZGljdCIsInN1YiI6ImM0MDgyNmFlLWNiYWUtNDYxZC1hMmExLWJmYTMyMGJjNzA2ZiJ9LCJlbWFpbCI6ImRiMzAzM0Bzcm1pc3QuZWR1LmluIiwibmFtZSI6ImRhcnNoYW4gYmVuZWRpY3QiLCJyb2xsTm8iOiJyYTIzMTEwMzIwMTAwMTAiLCJhY2Nlc3NDb2RlIjoiUWticHhIIiwiY2xpZW50SUQiOiJjNDA4MjZhZS1jYmFlLTQ2MWQtYTJhMS1iZmEzMjBiYzcwNmYiLCJjbGllbnRTZWNyZXQiOiJRZE5mU0t2ZG5kd3dVYkRQIn0.JXrs_32cB9Uqx3olD4OrpN8wMk8QIjGBEkX2r5Sb55E";

const HEADERS = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${TOKEN}`
};

const TYPE_WEIGHT = {
  "Placement": 3,
  "Result": 2,
  "Event": 1
};

async function fetchNotifications() {
  const res = await fetch("http://20.207.122.201/evaluation-service/notifications", {
    headers: HEADERS
  });
  const data = await res.json();
  return data.notifications;
}

function priorityScore(notification) {
  const weight = TYPE_WEIGHT[notification.Type] || 0;
  const ageMs = Date.now() - new Date(notification.Timestamp).getTime();
  const recencyScore = 1 / (1 + ageMs / 1000 / 60);
  return weight + recencyScore;
}

function getTopN(notifications, n) {
  return notifications
    .map(n => ({ ...n, score: priorityScore(n) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

async function main() {
  const n = 10;

  console.log("Fetching notifications...\n");
  const notifications = await fetchNotifications();
  console.log(`Total notifications: ${notifications.length}\n`);

  const top = getTopN(notifications, n);

  console.log(`Top ${n} Priority Notifications:`);
  console.log("─".repeat(60));
  top.forEach((notif, i) => {
    console.log(`${i + 1}. [${notif.Type}] ${notif.Message}`);
    console.log(`   Timestamp : ${notif.Timestamp}`);
    console.log(`   Score     : ${notif.score.toFixed(4)}`);
    console.log();
  });
}

main().catch(console.error);
