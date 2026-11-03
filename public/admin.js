const spinner = document.getElementById('spinner');
const errorBox = document.getElementById('errorBox');
const table = document.getElementById('userTable');
const userBody = document.getElementById('userBody');
const empty = document.getElementById('empty');
const cardSub = document.getElementById('cardSub');

function fmt(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch (_e) {
    return iso;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function load() {
  try {
    const res = await fetch('/api/admin/users', { credentials: 'include' });
    spinner.style.display = 'none';

    if (res.status === 401) {
      cardSub.textContent = 'Access denied';
      errorBox.style.display = 'block';
      errorBox.textContent = '401 — You are not signed in. Open the wallet and sign in with your admin wallet.';
      return;
    }
    if (res.status === 403) {
      cardSub.textContent = 'Access denied';
      errorBox.style.display = 'block';
      errorBox.textContent = '403 — Forbidden. This wallet is not an admin.';
      return;
    }
    if (!res.ok) {
      cardSub.textContent = 'Error';
      errorBox.style.display = 'block';
      errorBox.textContent = 'Failed to load users (' + res.status + ')';
      return;
    }

    const data = await res.json();
    const users = data.users || [];
    cardSub.textContent = users.length + ' user' + (users.length === 1 ? '' : 's') + ' total';

    if (users.length === 0) {
      empty.style.display = 'block';
      return;
    }

    userBody.innerHTML = users.map((u) => `
      <tr>
        <td data-label="Wallet" class="addr">${escapeHtml(u.walletAddress)}</td>
        <td data-label="Joined">${escapeHtml(fmt(u.createdAt))}</td>
        <td data-label="Last Login">${escapeHtml(fmt(u.lastLoginAt))}</td>
      </tr>
    `).join('');

    table.style.display = 'table';
  } catch (err) {
    spinner.style.display = 'none';
    cardSub.textContent = 'Error';
    errorBox.style.display = 'block';
    errorBox.textContent = 'Network error: ' + err.message;
  }
}

load();
