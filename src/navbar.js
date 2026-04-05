import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export function setupNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      let navLinks = `
        <a href="./" class="hover:text-blue-400">Home</a>
        <a href="./projects.html" class="hover:text-blue-400">Projects</a>
      `;

      if (userData) {
        if (userData.role === 'freelancer') {
          navLinks += `<a href="./freelancer_profile.html" class="hover:text-blue-400">Profile</a>`;
          navLinks += `<a href="./matched_projects.html" class="hover:text-blue-400">Matched Projects</a>`;
        } else if (userData.role === 'client') {
          navLinks += `<a href="./client_profile.html" class="hover:text-blue-400">Profile</a>`;
          navLinks += `<a href="./matched_projects.html" class="hover:text-blue-400">Matched Freelancers</a>`;
        } else if (userData.role === 'admin') {
          navLinks += `<a href="./admin_dashboard.html" class="hover:text-blue-400">Dashboard</a>`;
        }
      }

      navbar.innerHTML = `
        <div class="container mx-auto flex justify-between items-center p-4">
          <div class="text-2xl font-bold">EduLance</div>
          <div class="flex space-x-6 items-center">
            ${navLinks}
            <button id="logoutBtn" class="bg-red-500 px-4 py-2 rounded hover:bg-red-600">Logout</button>
          </div>
        </div>
      `;

      document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = './login.html';
      });
    } else {
      navbar.innerHTML = `
        <div class="container mx-auto flex justify-between items-center p-4">
          <div class="text-2xl font-bold">EduLance</div>
          <div class="flex space-x-6">
            <a href="./" class="hover:text-blue-400">Home</a>
            <a href="./login.html" class="hover:text-blue-400">Login</a>
            <a href="./register.html" class="hover:text-blue-400">Register</a>
          </div>
        </div>
      `;
    }
  });
}
