import { api } from '../js/api.js';
import { session, esc, toast } from '../js/core.js';

export async function render(root, params) {
  const box = document.getElementById('profile-content');
  box.innerHTML = '<p class="muted">Загрузка…</p>';

  const user = await api.getUser(session.userId);
  box.innerHTML = `
    <div class="card">
      <div class="card__head">
        <h2>${esc(user.name)}</h2>
        <span class="badge badge--muted">Пользователь</span>
      </div>
      <p class="muted">У вас пока нет роли на платформе. Запросите роль, чтобы создавать курсы или проверять работы.</p>
      <div class="btn-row">
        <button class="btn btn--primary" id="request-author">Запросить роль «Автор курса»</button>
      </div>
    </div>`;

  box.querySelector('#request-author').addEventListener('click', async () => {
    const btn = box.querySelector('#request-author');
    btn.disabled = true;
    try {
      await api.requestAuthorRole(session.userId);
      toast('Запрос на роль Автор курса отправлен', 'success');
      btn.textContent = 'Запрос отправлен';
    } catch (e) {
      toast(e.message, 'error');
      btn.disabled = false;
    }
  });
}
