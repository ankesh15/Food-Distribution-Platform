// Best-effort provider work must not delay committed HTTP workflows.
// This is deliberately process-local; guaranteed delivery requires a durable outbox.
const pending = new Set();
function schedule(job) {
  const task = Promise.resolve().then(job).catch(error => console.error('Background notification failed:', error.name)).finally(() => pending.delete(task));
  pending.add(task);
}
async function drain() { await Promise.allSettled([...pending]); }
module.exports = { schedule, drain };
