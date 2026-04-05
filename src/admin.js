import { db } from './firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { setupNavbar } from './navbar';
import { checkAuthAndRedirect, handleFirestoreError } from './utils';

setupNavbar();

async function init() {
  const authData = await checkAuthAndRedirect();
  if (!authData || authData.userData.role !== 'admin') {
    window.location.href = import.meta.env.BASE_URL;
    return;
  }

  const pendingUsersDiv = document.getElementById('pendingUsers');
  const q = query(collection(db, 'users'), where('isVerified', '==', false));

  onSnapshot(q, (snapshot) => {
    pendingUsersDiv.innerHTML = '';
    
    if (snapshot.empty) {
      pendingUsersDiv.innerHTML = '<div class="col-span-full text-center py-20 text-slate-400">No pending verifications.</div>';
      return;
    }

    snapshot.forEach((userDoc) => {
      const user = userDoc.data();
      const userId = userDoc.id;

      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h3 class="text-xl font-bold mb-2">${user.name}</h3>
        <p class="text-slate-400 text-sm mb-1">Email: ${user.email}</p>
        <p class="text-slate-400 text-sm mb-4 capitalize">Role: ${user.role}</p>
        
        <div class="space-y-2 mb-6">
          <a href="${user.verificationFolderLink}" target="_blank" class="block text-blue-400 hover:underline text-sm">View Verification Folder</a>
          ${user.resumeLink ? `<a href="${user.resumeLink}" target="_blank" class="block text-emerald-400 hover:underline text-sm">View Resume</a>` : '<p class="text-slate-500 text-sm italic">No resume provided</p>'}
          ${user.portfolioLink ? `<a href="${user.portfolioLink}" target="_blank" class="block text-purple-400 hover:underline text-sm">View Portfolio/GitHub</a>` : '<p class="text-slate-500 text-sm italic">No portfolio provided</p>'}
        </div>

        <div class="flex space-x-2">
          <button data-action="approve" data-id="${userId}" class="bg-emerald-600 px-4 py-2 rounded text-sm hover:bg-emerald-700 flex-1">Approve</button>
          <button data-action="reject" data-id="${userId}" class="bg-red-600 px-4 py-2 rounded text-sm hover:bg-red-700 flex-1">Reject</button>
        </div>
      `;
      pendingUsersDiv.appendChild(card);
    });

    // Add event listeners for buttons
    document.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const action = e.target.dataset.action;
        const id = e.target.dataset.id;
        
        if (action === 'approve') {
          try {
            await updateDoc(doc(db, 'users', id), { isVerified: true });
          } catch (err) {
            handleFirestoreError(err, 'update', `users/${id}`);
          }
        } else if (action === 'reject') {
          if (confirm('Are you sure you want to delete this user?')) {
            try {
              await deleteDoc(doc(db, 'users', id));
            } catch (err) {
              handleFirestoreError(err, 'delete', `users/${id}`);
            }
          }
        }
      });
    });
  }, (err) => {
    handleFirestoreError(err, 'list', 'users');
  });
}

init();
