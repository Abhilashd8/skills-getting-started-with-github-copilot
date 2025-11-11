document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageBox = document.getElementById("message");

  function showMessage(text, type = "info") {
    messageBox.textContent = text;
    messageBox.className = `message ${type}`;
    messageBox.classList.remove("hidden");
    setTimeout(() => messageBox.classList.add("hidden"), 4000);
  }

  function createParticipantItem(email, activityName) {
    const li = document.createElement("li");
    li.className = "participant-item";

    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.textContent = email.charAt(0).toUpperCase();

    const addr = document.createElement("span");
    addr.className = "participant-email";
    addr.textContent = email;

    // Delete (unregister) button
    const del = document.createElement("button");
    del.className = "participant-delete";
    del.type = "button";
    del.title = `Remove ${email}`;
    del.setAttribute('aria-label', `Remove ${email}`);
    del.textContent = "✖";

    del.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm(`Unregister ${email} from ${activityName}?`)) return;

      try {
        const url = `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`;
        const res = await fetch(url, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok) {
          showMessage(json.detail || json.message || "Could not remove participant", "error");
          return;
        }

        // Update local copy and re-render
        if (window.__activities && window.__activities[activityName]) {
          const parts = window.__activities[activityName].participants || [];
          window.__activities[activityName].participants = parts.filter(p => p !== email);
          renderActivities(window.__activities);
        } else {
          await loadActivities();
        }

        showMessage(json.message || `Removed ${email}`, "success");
      } catch (err) {
        console.error(err);
        showMessage("Network error while removing participant.", "error");
      }
    });

    li.appendChild(avatar);
    li.appendChild(addr);
    li.appendChild(del);
    return li;
  }

  function renderActivities(activities) {
    activitiesList.innerHTML = "";
    // Populate select
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

    Object.keys(activities).forEach((name) => {
      const a = activities[name];

      // Card container
      const card = document.createElement("div");
      card.className = "activity-card";

      const title = document.createElement("h4");
      title.textContent = name;

      const desc = document.createElement("p");
      desc.textContent = a.description;

      const meta = document.createElement("p");
      meta.className = "meta";
      meta.textContent = `${a.schedule} • Capacity: ${a.participants.length}/${a.max_participants}`;

      // Participants section
      const participantsSection = document.createElement("div");
      participantsSection.className = "participants-section";

      const participantsHeader = document.createElement("strong");
      participantsHeader.textContent = "Participants";

      const participantsList = document.createElement("ul");
      participantsList.className = "participant-list";

      if (Array.isArray(a.participants) && a.participants.length > 0) {
        a.participants.forEach((email) => {
          participantsList.appendChild(createParticipantItem(email, name));
        });
      } else {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "No participants yet.";
        participantsSection.appendChild(empty);
      }

      participantsSection.appendChild(participantsHeader);
      participantsSection.appendChild(participantsList);

      card.appendChild(title);
      card.appendChild(desc);
      card.appendChild(meta);
      card.appendChild(participantsSection);

      activitiesList.appendChild(card);

      // add to select
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      activitySelect.appendChild(opt);
    });
  }

  async function loadActivities() {
    try {
      const res = await fetch("/activities");
      if (!res.ok) throw new Error("Failed to load activities");
      const data = await res.json();
      // Keep a local copy so we can update UI after signup
      window.__activities = data;
      renderActivities(data);
    } catch (err) {
      activitiesList.innerHTML = `<p class="error">Could not load activities.</p>`;
      console.error(err);
    }
  }

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById("email");
    const activityName = activitySelect.value;
    const email = emailInput.value.trim();

    if (!activityName) {
      showMessage("Please choose an activity.", "error");
      return;
    }
    if (!email) {
      showMessage("Please enter your email.", "error");
      return;
    }

    try {
      const url = `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`;
      const res = await fetch(url, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        showMessage(json.detail || json.message || "Signup failed", "error");
        return;
      }

      showMessage(json.message || "Signed up!", "success");

      // Refresh activities from the server so the UI shows the authoritative
      // participant list (avoids subtle client-side desyncs). Keep it simple
      // and fetch the latest state after a successful signup.
      await loadActivities();

      signupForm.reset();
    } catch (err) {
      console.error(err);
      showMessage("Network error during signup.", "error");
    }
  });

  loadActivities();
});
