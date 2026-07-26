const form = document.getElementById('recipe-form');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const ingredients = document.getElementById('ingredients').value.trim();
  const diet = document.getElementById('diet').value;
  const time = document.getElementById('time').value;

  if (!ingredients) return;

  resultsEl.classList.add('hidden');
  resultsEl.innerHTML = '';
  statusEl.classList.remove('hidden');
  statusEl.textContent = 'The genie is thinking... 🧞‍♂️';
  submitBtn.disabled = true;

  try {
    const res = await fetch('/api/recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients, diet, time })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Something went wrong.');
    }

    renderRecipes(data.recipes);
    statusEl.classList.add('hidden');
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
    statusEl.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
  }
});

function renderRecipes(recipes) {
  resultsEl.innerHTML = '';

  if (!Array.isArray(recipes) || recipes.length === 0) {
    resultsEl.innerHTML = '<p class="error">No recipes came back. Try different ingredients.</p>';
    resultsEl.classList.remove('hidden');
    return;
  }

  recipes.forEach((r) => {
    const card = document.createElement('div');
    card.className = 'recipe-card';

    const ingredientsList = (r.ingredients_used || [])
      .map((i) => `<li>${escapeHtml(i)}</li>`)
      .join('');

    const stepsList = (r.steps || [])
      .map((s) => `<li>${escapeHtml(s)}</li>`)
      .join('');

    card.innerHTML = `
      <h3>${escapeHtml(r.title || 'Untitled recipe')}</h3>
      <div class="meta">⏱ ${escapeHtml(r.time_estimate || '')} · 🍽 ${escapeHtml(r.difficulty || '')}</div>
      <p><strong>Ingredients used:</strong></p>
      <ul>${ingredientsList}</ul>
      <p><strong>Steps:</strong></p>
      <ol>${stepsList}</ol>
      ${r.tip ? `<p><em>💡 Tip: ${escapeHtml(r.tip)}</em></p>` : ''}
    `;
    resultsEl.appendChild(card);
  });

  resultsEl.classList.remove('hidden');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
