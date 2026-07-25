const desksEl = document.getElementById("desks");
const feedEl = document.getElementById("feed");
const floorEl = document.getElementById("floor");
const runStateEl = document.getElementById("run-state");
const deliverableEl = document.getElementById("deliverable");
const deliverableContentEl = document.getElementById("deliverable-content");
const form = document.getElementById("brief-form");
const submitBtn = document.getElementById("submit-btn");

let agents = [];

async function loadAgents() {
  const res = await fetch("/api/agents");
  agents = await res.json();
  renderDesks();
}

function renderDesks() {
  desksEl.innerHTML = "";
  for (const agent of agents) {
    const desk = document.createElement("div");
    desk.className = "desk" + (agent.id === "ceo" ? " ceo" : "");
    desk.id = `desk-${agent.id}`;
    desk.innerHTML = `
      <div class="desk-top">
        <div>
          <div class="desk-name">${agent.name}</div>
          <div class="desk-title">${agent.title}</div>
        </div>
        <div class="status-dot" id="dot-${agent.id}"></div>
      </div>
      <div class="desk-note" id="note-${agent.id}">idle</div>
    `;
    desksEl.appendChild(desk);
  }
}

function setStatus(agentId, status) {
  const dot = document.getElementById(`dot-${agentId}`);
  const note = document.getElementById(`note-${agentId}`);
  if (!dot) return;
  dot.className = "status-dot" + (status ? ` ${status}` : "");
  if (note) note.textContent = status || "idle";
}

function pushFeedLine(agentId, message) {
  const line = document.createElement("div");
  line.className = "feed-line";
  const tag = agentId ? `<span class="agent-tag">[${agentId.toUpperCase()}]</span> ` : "";
  line.innerHTML = `${tag}${escapeHtml(message)}`;
  feedEl.prepend(line);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = "Briefing the floor...";

  const brief = Object.fromEntries(new FormData(form).entries());

  floorEl.hidden = false;
  deliverableEl.hidden = true;
  deliverableContentEl.textContent = "";
  feedEl.innerHTML = "";
  runStateEl.textContent = "— starting";
  for (const agent of agents) setStatus(agent.id, "");

  floorEl.scrollIntoView({ behavior: "smooth", block: "start" });

  const res = await fetch("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(brief),
  });
  const { runId } = await res.json();

  const source = new EventSource(`/api/stream/${runId}`);

  source.onmessage = (evt) => {
    const data = JSON.parse(evt.data);
    handleEvent(data, source);
  };

  source.onerror = () => {
    runStateEl.textContent = "— connection lost";
    source.close();
    resetSubmitButton();
  };
});

function handleEvent(data, source) {
  switch (data.type) {
    case "status":
      setStatus(data.agent, data.status);
      runStateEl.textContent = `— ${data.agent} ${data.status}`;
      break;
    case "log":
      pushFeedLine(data.agent, data.message);
      break;
    case "output":
      pushFeedLine(data.agent, `${data.label} delivered.`);
      break;
    case "final":
      deliverableEl.hidden = false;
      deliverableContentEl.textContent = data.content;
      deliverableEl.scrollIntoView({ behavior: "smooth", block: "start" });
      break;
    case "run_complete":
      runStateEl.textContent = "— complete";
      resetSubmitButton();
      source.close();
      break;
    case "error":
      pushFeedLine(null, `Error: ${data.message}`);
      runStateEl.textContent = "— error";
      resetSubmitButton();
      source.close();
      break;
  }
}

function resetSubmitButton() {
  submitBtn.disabled = false;
  submitBtn.textContent = "Send brief to the floor";
}

loadAgents();
