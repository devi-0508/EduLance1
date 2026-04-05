import { db } from './firebase';
import './common.css';
import { collection, onSnapshot, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { setupNavbar } from './navbar';
import { checkAuthAndRedirect, handleFirestoreError } from './utils';

setupNavbar();

async function init() {
  const authData = await checkAuthAndRedirect();
  if (!authData) return;

  const { userData, user } = authData;
  const pageTitle = document.getElementById('pageTitle');
  const matchList = document.getElementById('matchList');

  if (userData.role === 'freelancer') {
    pageTitle.textContent = 'Projects Matched to Your Skills';
    loadFreelancerMatches(userData);
  } else if (userData.role === 'client') {
    pageTitle.textContent = 'Freelancers Matched to Your Projects';
    loadClientMatches(user.uid);
  }
}

async function assignFreelancer(projectId, freelancerId, freelancerName) {
  if (!confirm(`Are you sure you want to assign ${freelancerName} to this project?`)) return;

  try {
    await updateDoc(doc(db, 'projects', projectId), {
      freelancerId: freelancerId,
      status: 'in-progress'
    });
    alert(`${freelancerName} has been assigned! You can now see this in your profile.`);
    window.location.reload();
  } catch (error) {
    handleFirestoreError(error, 'update', `projects/${projectId}`);
  }
}

async function loadFreelancerMatches(freelancerData) {
  const matchList = document.getElementById('matchList');
  const userSkills = (freelancerData.skills || []).map(s => s.toLowerCase().trim());

  if (userSkills.length === 0) {
    matchList.innerHTML = `
      <div class="card text-center py-10">
        <p class="text-slate-400 mb-4">You haven't added any skills yet.</p>
        <a href="${import.meta.env.BASE_URL}freelancer_profile.html" class="btn-primary inline-block">Add Skills Now</a>
      </div>
    `;
    return;
  }

  const q = query(collection(db, 'projects'), where('status', '==', 'open'));
  onSnapshot(q, (snapshot) => {
    matchList.innerHTML = '';
    const matches = [];

    snapshot.forEach(doc => {
      const project = doc.data();
      const projectSkills = (project.skills || []).map(s => s.toLowerCase().trim());
      const matchedSkills = userSkills.filter(s => projectSkills.includes(s));
      
      if (matchedSkills.length > 0) {
        const matchPercentage = (matchedSkills.length / projectSkills.length) * 100;
        matches.push({ id: doc.id, ...project, matchedSkills, matchPercentage });
      }
    });

    // Sort by match percentage
    matches.sort((a, b) => b.matchPercentage - a.matchPercentage);

    if (matches.length === 0) {
      matchList.innerHTML = '<div class="text-center py-20 text-slate-400">No matching projects found for your skills.</div>';
      return;
    }

    matches.forEach(async m => {
      const card = document.createElement('div');
      card.className = 'card';
      card.id = `project-${m.id}`;
      card.innerHTML = `
        <div class="flex justify-between items-start mb-4">
          <div>
            <h4 class="text-xl font-bold">${m.title}</h4>
            <p class="text-sm text-emerald-400 font-semibold mt-1">${Math.round(m.matchPercentage)}% Match</p>
          </div>
          <span class="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">$${m.budget}</span>
        </div>
        <p class="text-slate-400 text-sm mb-4">${m.description}</p>
        <div class="mb-4">
          <p class="text-xs text-slate-500 mb-1">Posted by:</p>
          <a href="${import.meta.env.BASE_URL}public_profile.html?uid=${m.clientId}" class="text-sm text-blue-400 hover:underline client-name" data-uid="${m.clientId}">Loading client...</a>
        </div>
        <div class="mb-4">
          <p class="text-xs text-slate-500 mb-2">Matched Skills:</p>
          <div class="flex flex-wrap gap-2">
            ${m.matchedSkills.map(s => `<span class="text-xs bg-emerald-600/30 text-emerald-400 px-2 py-1 rounded">${s}</span>`).join('')}
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <p class="text-xs text-slate-500 w-full mb-2">All Required Skills:</p>
          ${m.skills.map(s => `<span class="text-xs bg-slate-700 px-2 py-1 rounded">${s}</span>`).join('')}
        </div>
      `;
      matchList.appendChild(card);

      // Fetch client name and email
      const clientDoc = await getDoc(doc(db, 'users', m.clientId));
      if (clientDoc.exists()) {
        const clientData = clientDoc.data();
        const clientLink = card.querySelector('.client-name');
        if (clientLink) clientLink.textContent = clientData.name;
        
        // Add direct contact link
        const contactDiv = document.createElement('div');
        contactDiv.className = 'mt-4 pt-4 border-t border-slate-700 flex flex-col gap-2';
        contactDiv.innerHTML = `
          <div class="flex items-center text-xs text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span class="font-medium text-emerald-400 select-all">${clientData.email}</span>
          </div>
          <div class="flex justify-end items-center">
            <a href="${import.meta.env.BASE_URL}public_profile.html?uid=${m.clientId}" class="text-xs text-blue-400 hover:underline">View Full Profile</a>
          </div>
        `;
        card.appendChild(contactDiv);
      }
    });
  }, (err) => {
    handleFirestoreError(err, 'list', 'projects');
  });
}

async function loadClientMatches(clientId) {
  const matchList = document.getElementById('matchList');
  
  // 1. Get all open projects for this client
  const q = query(collection(db, 'projects'), where('clientId', '==', clientId), where('status', '==', 'open'));
  const projectsSnapshot = await getDocs(q);
  
  if (projectsSnapshot.empty) {
    matchList.innerHTML = `
      <div class="card text-center py-10">
        <p class="text-slate-400 mb-4">You haven't posted any open projects yet.</p>
        <a href="${import.meta.env.BASE_URL}client_profile.html" class="btn-primary inline-block">Post a Project</a>
      </div>
    `;
    return;
  }

  // 2. Get all verified freelancers
  const fq = query(collection(db, 'users'), where('role', '==', 'freelancer'), where('isVerified', '==', true));
  const freelancersSnapshot = await getDocs(fq);
  const freelancers = freelancersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  matchList.innerHTML = '';

  projectsSnapshot.forEach(projectDoc => {
    const project = projectDoc.data();
    const projectSkills = (project.skills || []).map(s => s.toLowerCase().trim());
    
    const matchedFreelancers = [];
    freelancers.forEach(f => {
      const freelancerSkills = (f.skills || []).map(s => s.toLowerCase().trim());
      const matchedSkills = freelancerSkills.filter(s => projectSkills.includes(s));
      
      if (matchedSkills.length > 0) {
        const matchPercentage = (matchedSkills.length / projectSkills.length) * 100;
        matchedFreelancers.push({ ...f, matchedSkills, matchPercentage });
      }
    });

    // Sort freelancers by match percentage
    matchedFreelancers.sort((a, b) => b.matchPercentage - a.matchPercentage);

    const projectSection = document.createElement('div');
    projectSection.className = 'space-y-4';
    projectSection.innerHTML = `
      <div class="border-b border-slate-700 pb-2">
        <h3 class="text-2xl font-bold text-blue-400">${project.title}</h3>
        <p class="text-sm text-slate-500">Required: ${project.skills.join(', ')}</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${matchedFreelancers.length > 0 ? matchedFreelancers.map(f => `
          <div class="card bg-slate-800/40">
            <div class="flex justify-between items-start mb-2">
              <a href="${import.meta.env.BASE_URL}public_profile.html?uid=${f.id}" class="font-bold text-blue-400 hover:underline">${f.name}</a>
              <span class="text-xs text-emerald-400">${Math.round(f.matchPercentage)}% Match</span>
            </div>
            <p class="text-xs text-slate-400 mb-4">${f.email}</p>
            <div class="mb-4">
              <p class="text-[10px] text-slate-500 mb-1">Matched Skills:</p>
              <div class="flex flex-wrap gap-1">
                ${f.matchedSkills.map(s => `<span class="text-[10px] bg-emerald-600/20 text-emerald-400 px-1.5 py-0.5 rounded">${s}</span>`).join('')}
              </div>
            </div>
            <div class="flex space-x-2 mt-2">
              ${f.resumeLink ? `<a href="${f.resumeLink}" target="_blank" class="text-xs text-blue-400 hover:underline">Resume</a>` : ''}
              ${f.portfolioLink ? `<a href="${f.portfolioLink}" target="_blank" class="text-xs text-purple-400 hover:underline">Portfolio</a>` : ''}
              <a href="mailto:${f.email}?subject=Project Inquiry: ${project.title}" class="text-xs text-emerald-400 hover:underline">Contact</a>
            </div>
            <button class="assign-btn w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded text-xs font-bold transition-colors"
                    data-project-id="${projectDoc.id}" data-freelancer-id="${f.id}" data-freelancer-name="${f.name}">
              Assign to Project
            </button>
          </div>
        `).join('') : '<p class="text-slate-500 italic text-sm py-4">No matching freelancers found for this project.</p>'}
      </div>
    `;
    matchList.appendChild(projectSection);
  });

  // Add event listeners to assign buttons
  document.querySelectorAll('.assign-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const { projectId, freelancerId, freelancerName } = e.target.dataset;
      assignFreelancer(projectId, freelancerId, freelancerName);
    });
  });
}

init();
