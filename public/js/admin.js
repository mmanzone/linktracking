document.addEventListener('DOMContentLoaded', () => {
    const adminPanelDiv = document.getElementById('admin-panel');
    const adminContentDiv = document.getElementById('admin-content');
    const tabsContainer = document.querySelector('.tabs');
    const logoutBtn = document.getElementById('logout-btn');

    let currentTenant = null;
    let currentUser = null;

    fetch('/api/me')
        .then(response => {
            if (!response.ok) {
                window.location.href = '/login.html';
                return;
            }
            return response.json();
        })
        .then(data => {
            currentUser = data.user;
            currentTenant = data.tenant;
            
            document.getElementById('admin-title').textContent = currentTenant.displayName;
            document.getElementById('logout-btn').textContent = `Logout ${currentUser.firstName || ''} ${currentUser.lastName || ''}`;
            
            // Prompt for name if missing
            if (!currentUser.firstName || !currentUser.lastName) {
                const namePrompt = document.createElement('div');
                namePrompt.classList.add('name-prompt', 'message', 'info');
                namePrompt.innerHTML = `
                    <form id="name-prompt-form">
                        <p>Please provide your name for a more personalised experience:</p>
                        <input type="text" id="firstName-prompt" placeholder="First Name" value="${currentUser.firstName || ''}" required>
                        <input type="text" id="lastName-prompt" placeholder="Last Name" value="${currentUser.lastName || ''}" required>
                        <button id="save-name-btn" type="submit">Save Name</button>
                    </form>
                `;
                adminPanelDiv.prepend(namePrompt);

                document.getElementById('name-prompt-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    const firstName = document.getElementById('firstName-prompt').value;
                    const lastName = document.getElementById('lastName-prompt').value;

                    if (!firstName || !lastName) {
                        alert('Please enter your first and last name.');
                        return;
                    }

                    const body = { ...currentUser, firstName, lastName };
                    
                    fetch(`/api/users/${currentUser.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    }).then(() => {
                        currentUser.firstName = firstName;
                        currentUser.lastName = lastName;
                        document.getElementById('logout-btn').textContent = `Logout ${firstName} ${lastName}`;
                        namePrompt.remove();
                    });
                });
            }
            
            if (currentUser.role === 'master-admin') {
                const tenantsTab = document.createElement('button');
                tenantsTab.classList.add('tab-link');
                tenantsTab.dataset.tab = 'tenants';
                tenantsTab.textContent = 'Tenants';
                tabsContainer.appendChild(tenantsTab);

                const usersTab = document.createElement('button');
                usersTab.classList.add('tab-link');
                usersTab.dataset.tab = 'users';
                usersTab.textContent = 'Users';
                tabsContainer.appendChild(usersTab);
            } else {
                const usersTab = document.createElement('button');
                usersTab.classList.add('tab-link');
                usersTab.dataset.tab = 'users';
                usersTab.textContent = 'Users';
                tabsContainer.appendChild(usersTab);
            }
            
            const tabs = document.querySelectorAll('.tab-link');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    loadAdminContent(tab.dataset.tab);
                });
            });

            adminPanelDiv.style.display = 'block';
            loadAdminContent('general');
        });
    
    logoutBtn.addEventListener('click', () => {
        document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = '/login.html';
    });


    function loadAdminContent(tab) {
        if (tab === 'tenants') {
            renderTenantsTab();
            return;
        } else if (tab === 'users') {
            renderUsersTab();
            return;
        }

        fetch('/api/admin/config')
            .then(response => response.json())
            .then(config => {
                adminContentDiv.innerHTML = '';
                switch (tab) {
                    case 'general':
                        renderGeneralTab(config);
                        break;
                    case 'links':
                        renderLinksTab(config);
                        break;
                    case 'campaigns':
                        renderCampaignsTab(config);
                        break;
                    case 'analytics':
                        renderAnalyticsTab(config);
                        break;
                }
            });
    }

    function renderUsersTab() {
        const isAdmin = currentUser.role === 'master-admin';
        const userApiUrl = isAdmin ? '/api/admin/users' : '/api/users';

        adminContentDiv.innerHTML = `
            <div id="users-tab" class="tab-content active">
                <h2>User Management</h2>
                <div id="users-list-container">
                    <div class="user-admin-header">
                        <div class="user-col-email sortable" data-sort="email">email</div>
                        <div class="user-col-name sortable" data-sort="firstName">First and last name</div>
                        <div class="user-col-login sortable" data-sort="lastLogin">Last connetion</div>
                        <div class="user-col-actions">Actions</div>
                    </div>
                    <div id="users-list"></div>
                </div>
                ${!isAdmin ? `
                <h3>Invite New User</h3>
                <form id="invite-user-form">
                    <label>Email: <input type="email" id="invite-email-input" required></label>
                    <button type="submit">Send Invite</button>
                </form>
                <p id="invite-message"></p>
                ` : ''}
            </div>
        `;

        const usersList = document.getElementById('users-list');
        fetch(userApiUrl)
            .then(res => res.json())
            .then(users => {
                let sortColumn = 'lastName';
                let sortDirection = 'asc';

                const renderUsers = () => {
                    usersList.innerHTML = '';
                    
                    users.sort((a, b) => {
                        let aVal = a[sortColumn] || '';
                        let bVal = b[sortColumn] || '';
                        if (sortDirection === 'asc') {
                            return aVal.localeCompare(bVal);
                        } else {
                            return bVal.localeCompare(aVal);
                        }
                    });

                    const currentUserIndex = users.findIndex(u => u.id === currentUser.id);
                    if (currentUserIndex > -1) {
                        const [currentUserData] = users.splice(currentUserIndex, 1);
                        users.unshift(currentUserData);
                    }

                    users.forEach(user => {
                        const userEl = document.createElement('div');
                        userEl.classList.add('user-admin-row');
                        if (user.disabled) {
                            userEl.classList.add('inactive');
                        }
                        userEl.dataset.userId = user.id;
                        const isCurrentUser = user.id === currentUser.id;
                        
                        userEl.innerHTML = `
                            <div class="user-col-email">${user.email}</div>
                            <div class="user-col-name">${user.firstName || ''} ${user.lastName || ''}</div>
                            <div class="user-col-login">${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</div>
                            <div class="user-col-actions">
                                <button class="edit-user">Edit</button>
                                ${!isCurrentUser ? '<button class="delete-user">Delete</button>' : ''}
                            </div>
                        `;
                        usersList.appendChild(userEl);
                    });
                };

                document.querySelectorAll('.user-admin-header .sortable').forEach(header => {
                    header.addEventListener('click', () => {
                        const newSortColumn = header.dataset.sort;
                        if (sortColumn === newSortColumn) {
                            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                        } else {
                            sortColumn = newSortColumn;
                            sortDirection = 'asc';
                        }
                        renderUsers();
                    });
                });

                renderUsers();
            });
        
        usersList.addEventListener('click', (e) => {
            const userId = e.target.closest('.user-admin-row').dataset.userId;
            
            if (e.target.classList.contains('delete-user')) {
                if (confirm('Are you sure you want to delete this user?')) {
                    fetch(`/api/users/${userId}`, { method: 'DELETE' })
                        .then(() => loadAdminContent('users'));
                }
            }
            if (e.target.classList.contains('edit-user')) {
                const row = e.target.closest('.user-admin-row');
                fetch(userApiUrl).then(res => res.json()).then(users => {
                    const user = users.find(u => u.id === userId);
                    row.innerHTML = `
                        <div class="user-col-email"><input type="email" class="edit-email" value="${user.email}"></div>
                        <div class="user-col-name">
                            <input type="text" class="edit-firstName" value="${user.firstName || ''}" placeholder="First Name">
                            <input type="text" class="edit-lastName" value="${user.lastName || ''}" placeholder="Last Name">
                        </div>
                        <div class="user-col-login">
                             <label class="switch">
                                <input type="checkbox" class="edit-disabled" ${user.disabled ? 'checked' : ''}>
                                <span class="slider round"></span>
                            </label>
                        </div>
                        <div class="user-col-actions">
                            <button class="save-user" data-id="${user.id}">Save</button>
                            <button class="cancel-edit">Cancel</button>
                        </div>
                    `;
                });
            }
            if (e.target.classList.contains('save-user')) {
                const row = e.target.closest('.user-admin-row');
                const body = {
                    firstName: row.querySelector('.edit-firstName').value,
                    lastName: row.querySelector('.edit-lastName').value,
                    email: row.querySelector('.edit-email').value,
                    disabled: row.querySelector('.edit-disabled').checked
                };
                fetch(`/api/users/${userId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                }).then(() => {
                    const button = e.target;
                    button.classList.add('success');
                    button.textContent = 'Saved!';
                    setTimeout(() => {
                        loadAdminContent('users');
                    }, 1000);
                });
            }
            if (e.target.classList.contains('cancel-edit')) {
                loadAdminContent('users');
            }
        });

        if (!isAdmin) {
            document.getElementById('invite-user-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('invite-email-input').value;
                const messageEl = document.getElementById('invite-message');
                messageEl.textContent = 'Sending invite...';

                fetch('/api/users/invite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                }).then(() => {
                    document.getElementById('invite-email-input').value = '';
                    messageEl.textContent = 'Invite sent successfully!';
                    loadAdminContent('users');
                });
            });
        }
    }
    
    function renderTenantsTab() {
        adminContentDiv.innerHTML = `
            <div id="tenants-tab" class="tab-content active">
                <h2>Tenant Management</h2>
                <div id="tenants-list"></div>
                <h3>Create New Tenant</h3>
                <form id="create-tenant-form">
                    <label>Tenant Name (for URL, e.g., 'my-company'): <input type="text" id="tenant-name-input" required></label>
                    <label>Display Name: <input type="text" id="tenant-display-name-input" required></label>
                    <label>Admin Email: <input type="email" id="tenant-email-input" required></label>
                    <label><input type="checkbox" id="send-welcome-email-checkbox" checked> Send welcome email</label>
                    <button type="submit">Create Tenant</button>
                </form>
            </div>
        `;

        const tenantsList = document.getElementById('tenants-list');
        fetch('/api/tenants')
            .then(res => res.json())
            .then(tenants => {
                tenants.forEach(tenant => {
                    const tenantEl = document.createElement('div');
                    tenantEl.classList.add('tenant-admin-row');
                    tenantEl.dataset.tenantId = tenant.name;
                    tenantEl.innerHTML = `
                        <span>${tenant.displayName} (${tenant.name})</span>
                        <div>
                            <button class="edit-tenant" data-id="${tenant.name}">Edit</button>
                            <button class="delete-tenant" data-id="${tenant.name}">Delete</button>
                        </div>
                    `;
                    tenantsList.appendChild(tenantEl);
                });
            });
        
        tenantsList.addEventListener('click', (e) => {
            const tenantId = e.target.closest('.tenant-admin-row').dataset.tenantId;
            if (e.target.classList.contains('delete-tenant')) {
                if (confirm(`Are you sure you want to delete tenant ${tenantId}? This is irreversible.`)) {
                    fetch(`/api/tenants/${tenantId}`, { method: 'DELETE' })
                        .then(() => loadAdminContent('tenants'));
                }
            }
            if (e.target.classList.contains('edit-tenant')) {
                const row = e.target.closest('.tenant-admin-row');
                const span = row.querySelector('span');
                const originalText = span.textContent;
                const tenant = {
                    displayName: originalText.substring(0, originalText.lastIndexOf('(') - 1),
                    name: tenantId
                };
                
                row.innerHTML = `
                    <input type="text" class="edit-displayName" value="${tenant.displayName}">
                    <button class="save-tenant" data-id="${tenant.name}">Save</button>
                    <button class="cancel-edit">Cancel</button>
                `;
            }
            if (e.target.classList.contains('save-tenant')) {
                const row = e.target.closest('.tenant-admin-row');
                const displayName = row.querySelector('.edit-displayName').value;
                fetch(`/api/tenants/${tenantId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ displayName })
                }).then(() => loadAdminContent('tenants'));
            }
            if (e.target.classList.contains('cancel-edit')) {
                loadAdminContent('tenants');
            }
        });

        document.getElementById('create-tenant-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('tenant-name-input').value;
            const displayName = document.getElementById('tenant-display-name-input').value;
            const email = document.getElementById('tenant-email-input').value;
            const sendWelcomeEmail = document.getElementById('send-welcome-email-checkbox').checked;
            
            fetch('/api/tenants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, displayName, email, sendWelcomeEmail })
            }).then(() => loadAdminContent('tenants'));
        });
    }

    function renderGeneralTab(config) {
        adminContentDiv.innerHTML = `
            <div id="general-tab" class="tab-content active">
                <h2>Landing Page Content</h2>
                <label>Organisation name: <input type="text" id="company-name-input" value="${config.companyName}"></label><br>
                <label>Introduction Text: <textarea id="description-input">${config.description}</textarea></label><br>
                <label>Logo: <input type="file" id="logo-upload"></label><br>
                <img id="logo-preview" src="${config.logo}" style="max-width: 100px;"><br>
                <div class="button-container"><button id="save-content">Save Content</button></div>
                
                <h2>Theme</h2>
                <div class="theme-setting">
                    <label>Background Color: 
                        <input type="color" id="bg-color-picker" value="${config.theme.backgroundColor || '#f0f2f5'}">
                        <input type="text" id="bg-color-input" value="${config.theme.backgroundColor || '#f0f2f5'}" size="7">
                    </label>
                </div>
                <div class="theme-setting">
                    <label>Container Color: 
                        <input type="color" id="container-color-picker" value="${config.theme.containerColor || '#ffffff'}">
                        <input type="text" id="container-color-input" value="${config.theme.containerColor || '#ffffff'}" size="7">
                    </label>
                </div>
                <div class="theme-setting">
                    <label>Primary Color (Header): 
                        <input type="color" id="primary-color-picker" value="${config.theme.primaryColor}">
                        <input type="text" id="primary-color-input" value="${config.theme.primaryColor}" size="7">
                    </label>
                    <label>Text Color: 
                        <input type="color" id="primary-text-color-picker" value="${config.theme.primaryTextColor || '#000000'}">
                        <input type="text" id="primary-text-color-input" value="${config.theme.primaryTextColor || '#000000'}" size="7">
                    </label>
                </div>
                <div class="theme-setting">
                    <label>Secondary Color (Links): 
                        <input type="color" id="secondary-color-picker" value="${config.theme.secondaryColor}">
                        <input type="text" id="secondary-color-input" value="${config.theme.secondaryColor}" size="7">
                    </label>
                    <label>Text Color: 
                        <input type="color" id="secondary-text-color-picker" value="${config.theme.secondaryTextColor || '#000000'}">
                        <input type="text" id="secondary-text-color-input" value="${config.theme.secondaryTextColor || '#000000'}" size="7">
                    </label>
                </div>
                <div class="button-container"><button id="save-theme">Save Theme</button></div>

                <h2>Social Links</h2>
                <div id="social-links-admin"></div>
                <button id="add-social-link">Add Social Link</button>
                <div class="button-container"><button id="save-social-links">Save Social Links</button></div>

                <h2>QR Codes</h2>
                <div style="display: flex; gap: 20px;">
                    <div>
                        <p>Standard</p>
                        <div id="qrcode-standard"></div>
                        <button id="download-standard">Download</button>
                    </div>
                    <div>
                        <p>With Logo</p>
                        <div id="qrcode-logo"></div>
                        <button id="download-logo">Download</button>
                    </div>
                </div>
            </div>
        `;

        const tenantUrl = `${window.location.origin}/${currentTenant.name}`;
        
        new QRCode(document.getElementById("qrcode-standard"), {
            text: tenantUrl,
            width: 256,
            height: 256,
            colorDark : config.theme.primaryColor,
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });

        const qrLogoContainer = document.getElementById("qrcode-logo");
        qrLogoContainer.innerHTML = ''; 

        new QRCode(qrLogoContainer, {
            text: tenantUrl,
            width: 256,
            height: 256,
            colorDark: config.theme.primaryColor,
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        const canvas = qrLogoContainer.querySelector('canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const logoImg = new Image();
            logoImg.crossOrigin = "Anonymous";
            logoImg.onload = function() {
                const logoSize = 64;
                const logoX = (256 - logoSize) / 2;
                const logoY = (256 - logoSize) / 2;
                
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(logoX, logoY, logoSize, logoSize);
                
                ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
            };
            logoImg.src = config.logo;
        }

        document.getElementById('download-standard').addEventListener('click', () => {
            const canvas = document.querySelector('#qrcode-standard canvas');
            if (canvas) {
                const link = document.createElement('a');
                link.download = 'qrcode-standard.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        });
        document.getElementById('download-logo').addEventListener('click', () => {
            const canvas = document.querySelector('#qrcode-logo canvas');
            if (canvas) {
                const link = document.createElement('a');
                link.download = 'qrcode-logo.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        });


        const syncColorInputs = (pickerId, inputId) => {
            const picker = document.getElementById(pickerId);
            const input = document.getElementById(inputId);
            picker.addEventListener('input', (e) => input.value = e.target.value);
            input.addEventListener('input', (e) => picker.value = e.target.value);
        };
        syncColorInputs('bg-color-picker', 'bg-color-input');
        syncColorInputs('container-color-picker', 'container-color-input');
        syncColorInputs('primary-color-picker', 'primary-color-input');
        syncColorInputs('primary-text-color-picker', 'primary-text-color-input');
        syncColorInputs('secondary-color-picker', 'secondary-color-input');
        syncColorInputs('secondary-text-color-picker', 'secondary-text-color-input');

        document.getElementById('save-theme').addEventListener('click', (e) => {
            const newConfig = { ...config };
            newConfig.theme.backgroundColor = document.getElementById('bg-color-input').value;
            newConfig.theme.containerColor = document.getElementById('container-color-input').value;
            newConfig.theme.primaryColor = document.getElementById('primary-color-input').value;
            newConfig.theme.primaryTextColor = document.getElementById('primary-text-color-input').value;
            newConfig.theme.secondaryColor = document.getElementById('secondary-color-input').value;
            newConfig.theme.secondaryTextColor = document.getElementById('secondary-text-color-input').value;
            saveConfig(newConfig, e.target);
        });

        const socialLinksAdmin = document.getElementById('social-links-admin');
        config.socialLinks.forEach((link, index) => {
            const linkEl = document.createElement('div');
            linkEl.innerHTML = `
                <select data-index="${index}">
                    <option value="facebook" ${link.name === 'facebook' ? 'selected' : ''}>Facebook</option>
                    <option value="instagram" ${link.name === 'instagram' ? 'selected' : ''}>Instagram</option>
                    <option value="youtube" ${link.name === 'youtube' ? 'selected' : ''}>Youtube</option>
                    <option value="x" ${link.name === 'x' ? 'selected' : ''}>X</option>
                    <option value="tiktok" ${link.name === 'tiktok' ? 'selected' : ''}>Tiktok</option>
                    <option value="linkedin" ${link.name === 'linkedin' ? 'selected' : ''}>LinkedIn</option>
                </select>
                <input type="text" value="${link.url}" data-index="${index}">
                <button class="delete-social" data-index="${index}">Delete</button>
            `;
            socialLinksAdmin.appendChild(linkEl);
        });

        document.getElementById('add-social-link').addEventListener('click', (e) => {
            const newConfig = { ...config };
            newConfig.socialLinks.push({ name: 'facebook', url: '' });
            saveConfig(newConfig, e.target).then(() => renderGeneralTab(newConfig));
        });

        socialLinksAdmin.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-social')) {
                const index = parseInt(e.target.dataset.index, 10);
                const newConfig = { ...config };
                newConfig.socialLinks.splice(index, 1);
                saveConfig(newConfig, e.target).then(() => renderGeneralTab(newConfig));
            }
        });

        document.getElementById('save-social-links').addEventListener('click', (e) => {
            const newConfig = { ...config };
            const urlInputs = socialLinksAdmin.querySelectorAll('input[type="text"]');
            const nameSelects = socialLinksAdmin.querySelectorAll('select');
            newConfig.socialLinks = Array.from(urlInputs).map((input, index) => ({
                name: nameSelects[index].value,
                url: input.value
            }));
            saveConfig(newConfig, e.target);
        });

        let newLogoFile = null;

        document.getElementById('logo-upload').addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                newLogoFile = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('logo-preview').src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        document.getElementById('save-content').addEventListener('click', (e) => {
            const saveButton = e.target;
            const newConfig = { ...config };
            newConfig.companyName = document.getElementById('company-name-input').value;
            newConfig.description = document.getElementById('description-input').value;

            if (newLogoFile) {
                saveButton.textContent = 'Uploading...';
                const reader = new FileReader();
                reader.onload = (readEvent) => {
                    const content = readEvent.target.result.split(',')[1];
                    fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filename: newLogoFile.name, content })
                    })
                    .then(response => {
                        if (!response.ok) throw new Error(`Upload failed with status: ${response.status}`);
                        return response.json();
                    })
                    .then(data => {
                        if (!data.url) throw new Error('Upload failed, no URL returned.');
                        newConfig.logo = data.url;
                        saveConfig(newConfig, saveButton).then(() => {
                            newLogoFile = null; 
                            loadAdminContent('general'); 
                        });
                    })
                    .catch(error => {
                        console.error('Logo upload failed:', error);
                        alert('Logo upload failed. Please ensure your Vercel Blob store is configured correctly and check the console for details.');
                        saveButton.textContent = 'Save Content';
                    });
                };
                reader.readAsDataURL(newLogoFile);
            } else {
                newConfig.logo = document.getElementById('logo-preview').src;
                saveConfig(newConfig, saveButton);
            }
        });
    }

    function renderLinksTab(config) {
        adminContentDiv.innerHTML = `
            <div id="links-tab" class="tab-content active">
                <h2>Links Management</h2>
                <p style="font-size: 0.9rem; color: #606770;">
                    This is the library of links available on this platform. You can choose the order you want them to be displayed and where they will redirect the visitor. You can hide a link from the portal, e.g. for a link that's only seasonal or temporary. You can also create campaigns to show only a specific set of links during a specified period; this way you can make the list of links relevant to the event/campaign you are participating in.
                </p>
                <div class="link-admin-header">
                    <div>Move</div>
                    <div>Logo</div>
                    <div>Link Name</div>
                    <div>Link Address</div>
                    <div style="text-align: right;">Actions</div>
                </div>
                <div id="links-list"></div>
                <button id="add-link">Add New Link</button>
            </div>
        `;

        const linksList = document.getElementById('links-list');

        config.links.forEach((link, index) => {
            const linkElement = document.createElement('div');
            linkElement.classList.add('link-admin');
            if (!link.visible) {
                linkElement.classList.add('inactive');
            }
            linkElement.dataset.id = link.id;
            linkElement.innerHTML = `
                <div class="link-order">
                    <button class="move-up" ${index === 0 ? 'disabled' : ''}>▲</button>
                    <button class="move-down" ${index === config.links.length - 1 ? 'disabled' : ''}>▼</button>
                </div>
                <div>
                    <img src="${link.icon}" style="width: 64px; height: 64px; vertical-align: middle;">
                    <input type="file" class="link-icon-upload" style="display: none;">
                    <button class="change-icon" title="Change Icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    </button>
                </div>
                <input type="text" class="link-text-edit" value="${link.text}" placeholder="Link Name">
                <input type="text" class="link-url-edit" value="${link.url}" placeholder="https://...">
                <label class="switch">
                    <input type="checkbox" class="hide-link-toggle" ${link.visible ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
                <button class="delete-link">Delete</button>
            `;
            linksList.appendChild(linkElement);
        });

        document.getElementById('add-link').addEventListener('click', () => {
            const newConfig = { ...config };
            newConfig.links.push({
                id: Date.now().toString(),
                text: '',
                url: '',
                icon: '/images/icons/link.svg',
                visible: true
            });
            saveConfig(newConfig).then(() => loadAdminContent('links'));
        });

        linksList.addEventListener('click', (event) => {
            const linkAdmin = event.target.closest('.link-admin');
            if (!linkAdmin) return;
            const linkId = linkAdmin.dataset.id;
            
            let newConfig = { ...config };
            const linkIndex = newConfig.links.findIndex(l => l.id === linkId);

            const changeIconButton = event.target.closest('.change-icon');
            if (changeIconButton) {
                linkAdmin.querySelector('.link-icon-upload').click();
            }

            if (event.target.classList.contains('move-up')) {
                [newConfig.links[linkIndex], newConfig.links[linkIndex - 1]] = [newConfig.links[linkIndex - 1], newConfig.links[linkIndex]];
                saveConfig(newConfig, event.target).then(() => loadAdminContent('links'));
            }

            if (event.target.classList.contains('move-down')) {
                [newConfig.links[linkIndex], newConfig.links[linkIndex + 1]] = [newConfig.links[linkIndex + 1], newConfig.links[linkIndex]];
                saveConfig(newConfig, event.target).then(() => loadAdminContent('links'));
            }

            if (event.target.classList.contains('hide-link-toggle')) {
                newConfig.links[linkIndex].visible = event.target.checked;
                saveConfig(newConfig).then(() => loadAdminContent('links'));
            }

            if (event.target.classList.contains('delete-link')) {
                if (confirm('Are you sure you want to delete this link?')) {
                    newConfig.links = newConfig.links.filter(l => l.id !== linkId);
                    saveConfig(newConfig).then(() => loadAdminContent('links'));
                }
            }
        });

        linksList.addEventListener('change', (event) => {
            if (event.target.classList.contains('link-icon-upload')) {
                const file = event.target.files[0];
                if (file) {
                    const linkAdmin = event.target.closest('.link-admin');
                    const linkId = linkAdmin.dataset.id;
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const content = e.target.result.split(',')[1];
                        const originalHtml = linkAdmin.innerHTML;
                        linkAdmin.innerHTML += '<div class="upload-indicator">Uploading...</div>';

                        fetch('/api/upload', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ filename: file.name, content })
                        })
                        .then(response => {
                            if (!response.ok) throw new Error(`Upload failed with status: ${response.status}`);
                            return response.json();
                        })
                        .then(data => {
                            if (!data.url) throw new Error('Upload failed, no URL returned.');
                            let newConfig = { ...config };
                            const link = newConfig.links.find(l => l.id === linkId);
                            link.icon = data.url;
                            saveConfig(newConfig).then(() => loadAdminContent('links'));
                        })
                        .catch(error => {
                            console.error('Icon upload failed:', error);
                            alert('Icon upload failed. Please check the console for details.');
                            linkAdmin.innerHTML = originalHtml; 
                        });
                    };
                    reader.readAsDataURL(file);
                }
            }

            if (event.target.classList.contains('link-text-edit') || event.target.classList.contains('link-url-edit')) {
                const linkAdmin = event.target.closest('.link-admin');
                const linkId = linkAdmin.dataset.id;
                let newConfig = { ...config };
                const link = newConfig.links.find(l => l.id === linkId);
                link.text = linkAdmin.querySelector('.link-text-edit').value;
                link.url = linkAdmin.querySelector('.link-url-edit').value;
                saveConfig(newConfig).then(() => {
                    let feedback = linkAdmin.querySelector('.update-feedback');
                    if (!feedback) {
                        feedback = document.createElement('div');
                        feedback.className = 'update-feedback';
                        linkAdmin.appendChild(feedback);
                    }
                    feedback.textContent = 'Updated!';
                    setTimeout(() => feedback.textContent = '', 2000);
                });
            }
        });
    }

    function renderCampaignsTab() {
        let tenantFilter = '';
        if (currentUser.role === 'master-admin') {
            tenantFilter = `
                <select id="tenant-campaign-filter">
                    <option value="">All Tenants</option>
                </select>
            `;
        }
        adminContentDiv.innerHTML = `
            <div id="campaigns-tab" class="tab-content active">
                <h2>Campaign Management</h2>
                <p style="font-size: 0.9rem; color: #606770;">
                    Campaigns allow you to specify a specific event that you want to track separately, e.g. an event, exhibition or specific outreach. 
                    For each campaign, set the start and end dates, the name of the campaign/event, a description for you to remember, and a banner message that will be displayed on the landing page during the campaign.
                    You can then choose which links from the library you want to display and in which order. The selected links and order will only apply during the campaign dates. If you need to add a link for that campaign, you need to create it in the Links admin menu first.
                    You can see the results of the campaign in this menu, or in the Analytics page, using the Campaign filter.
                </p>
                <div id="campaign-filters">
                    ${tenantFilter}
                    <label>Show campaigns started in the last: 
                        <select id="campaign-date-filter">
                            <option value="180">6 months</option>
                            <option value="30">1 month</option>
                            <option value="90">3 months</option>
                            <option value="365">12 months</option>
                            <option value="all">All time</option>
                        </select>
                    </label>
                </div>
                <div id="campaigns-list"></div>
                <button id="add-campaign">Add New Campaign</button>
            </div>
        `;

        const campaignsList = document.getElementById('campaigns-list');
        const campaignDateFilter = document.getElementById('campaign-date-filter');

        const displayCampaigns = (campaigns, config) => {
            campaignsList.innerHTML = '';
            const filterValue = campaignDateFilter.value;
            const now = new Date();
            let startDate = new Date();
            if (filterValue !== 'all') {
                startDate.setDate(now.getDate() - parseInt(filterValue));
            } else {
                startDate = new Date(0);
            }

            campaigns
                .filter(c => {
                    const campaignStartDate = new Date(c.startDate);
                    return campaignStartDate >= startDate || campaignStartDate > now;
                })
                .forEach(campaign => {
                    const campaignElement = document.createElement('div');
                    campaignElement.classList.add('campaign-admin');
                    campaignElement.dataset.id = campaign.id;
                    campaignElement.innerHTML = `
                        <div>
                            <strong>${campaign.name}</strong><br>
                            <small>${new Date(campaign.startDate).toLocaleDateString()} - ${new Date(campaign.endDate).toLocaleDateString()}</small>
                        </div>
                        <div>
                            <button class="edit-campaign">Edit</button>
                            <button class="view-campaign-stats">View Stats</button>
                            <button class="delete-campaign">Delete</button>
                        </div>
                    `;
                    campaignsList.appendChild(campaignElement);
                });
        };

        const fetchAndDisplayCampaigns = () => {
            fetch('/api/admin/config').then(res => res.json()).then(config => {
                displayCampaigns(config.campaigns, config);
            });
        };
        
        document.getElementById('add-campaign').addEventListener('click', (e) => {
            fetch('/api/admin/config').then(res => res.json()).then(config => {
                const newConfig = { ...config };
                const startDate = new Date();
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date();
                endDate.setHours(23, 59, 59, 999);

                newConfig.campaigns.push({
                    id: Date.now().toString(),
                    name: 'New Campaign',
                    description: '',
                    message: '',
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    links: config.links.map(l => l.id) 
                });
                saveConfig(newConfig, e.target).then(() => loadAdminContent('campaigns'));
            });
        });
        
        fetchAndDisplayCampaigns();
        campaignDateFilter.addEventListener('change', fetchAndDisplayCampaigns);

        campaignsList.addEventListener('click', (event) => {
            const campaignId = event.target.closest('.campaign-admin')?.dataset.id;
            if (!campaignId) return;

            fetch('/api/admin/config').then(res => res.json()).then(config => {
                let newConfig = { ...config };
                const campaign = newConfig.campaigns.find(c => c.id === campaignId);

                if (event.target.classList.contains('save-edit-campaign')) {
                    const campaignAdmin = event.target.closest('.campaign-admin');
                    const newStartDate = new Date(campaignAdmin.querySelector('.campaign-start-edit').value);
                    const newEndDate = new Date(campaignAdmin.querySelector('.campaign-end-edit').value);
                    
                    if (newEndDate < newStartDate) {
                        alert('Error: End date cannot be before the start date.');
                        return;
                    }
                    newEndDate.setHours(23, 59, 59, 999); 

                    const overlaps = newConfig.campaigns.some(c => {
                        if (c.id === campaignId) return false;
                        const existingStart = new Date(c.startDate);
                        const existingEnd = new Date(c.endDate);
                        return (newStartDate < existingEnd && newEndDate > existingStart);
                    });

                    if (overlaps) {
                        alert('Error: Campaign dates overlap with an existing campaign.');
                        return;
                    }

                    campaign.name = campaignAdmin.querySelector('.campaign-name-edit').value;
                    campaign.description = campaignAdmin.querySelector('.campaign-description-edit').value;
                    campaign.message = campaignAdmin.querySelector('.campaign-message-edit').value;
                    campaign.startDate = newStartDate.toISOString();
                    campaign.endDate = newEndDate.toISOString();
                    
                    const linkRows = campaignAdmin.querySelectorAll('.campaign-link-row');
                    campaign.links = Array.from(linkRows)
                        .filter(row => row.querySelector('input[type="checkbox"]').checked)
                        .map(row => row.dataset.id);

                    saveConfig(newConfig, event.target).then(() => loadAdminContent('campaigns'));
                }

                if (event.target.classList.contains('cancel-edit-campaign')) {
                    loadAdminContent('campaigns');
                }

                if (event.target.classList.contains('edit-campaign')) {
                    const campaignAdmin = event.target.closest('.campaign-admin');
                    
                    const campaignLinkIds = new Set(campaign.links);
                    const sortedLinksForCampaign = [
                        ...campaign.links.map(id => config.links.find(l => l.id === id)).filter(Boolean),
                        ...config.links.filter(l => !campaignLinkIds.has(l.id))
                    ];

                    const campaignLinksHtml = sortedLinksForCampaign.map(link => `
                        <div class="campaign-link-row" data-id="${link.id}">
                            <div class="link-order">
                                <button class="move-link-up">▲</button>
                                <button class="move-link-down">▼</button>
                            </div>
                            <input type="checkbox" value="${link.id}" ${campaign.links.includes(link.id) ? 'checked' : ''}>
                            <div class="link">
                                <img src="${link.icon}" alt="${link.text}" style="height: 64px;">
                                <span>${link.text}</span>
                            </div>
                        </div>
                    `).join('');

                    campaignAdmin.innerHTML = `
                        <div style="width: 100%;">
                            <label>Campaign Name: <input type="text" class="campaign-name-edit" value="${campaign.name}"></label>
                            <label>Admin Description: <textarea class="campaign-description-edit" placeholder="For internal reference...">${campaign.description || ''}</textarea></label>
                            <label>Banner Message: <input type="text" class="campaign-message-edit" placeholder="Displayed on the page..." value="${campaign.message || ''}" maxlength="40" style="width: 100%;"></label>
                            <div style="display: flex; gap: 10px;">
                                <label>Start Date: <input type="date" class="campaign-start-edit" value="${campaign.startDate.slice(0, 10)}"></label>
                                <label>End Date: <input type="date" class="campaign-end-edit" value="${campaign.endDate.slice(0, 10)}"></label>
                            </div>
                            <h4>Links</h4>
                            <div class="campaign-links-header">
                                <div class="link-order-header">Move</div>
                                <div class="link-display-header">Display/Hide</div>
                                <div class="link-name-header">Link</div>
                            </div>
                            <div class="campaign-links-edit">${campaignLinksHtml}</div>
                            <div class="button-container">
                                <button class="save-edit-campaign">Save</button>
                                <button class="cancel-edit">Cancel</button>
                            </div>
                        </div>
                    `;
                }

                if (event.target.classList.contains('move-link-up')) {
                    const linkRow = event.target.closest('.campaign-link-row');
                    if (linkRow.previousElementSibling) {
                        linkRow.parentNode.insertBefore(linkRow, linkRow.previousElementSibling);
                    }
                }

                if (event.target.classList.contains('move-link-down')) {
                    const linkRow = event.target.closest('.campaign-link-row');
                    if (linkRow.nextElementSibling) {
                        linkRow.parentNode.insertBefore(linkRow.nextElementSibling, linkRow);
                    }
                }

                if (event.target.classList.contains('view-campaign-stats')) {
                    const campaignAdmin = event.target.closest('.campaign-admin');
                    let statsContainer = campaignAdmin.querySelector('.campaign-stats-container');
                    if (statsContainer) {
                        statsContainer.remove();
                        return;
                    }

                    statsContainer = document.createElement('div');
                    statsContainer.classList.add('campaign-stats-container');
                    campaignAdmin.appendChild(statsContainer);

                    fetch('/api/analytics')
                        .then(response => response.json())
                        .then(analytics => {
                            const campaignStartDate = new Date(campaign.startDate);
                            const campaignEndDate = new Date(campaign.endDate);
                            const campaignVisits = analytics.visits.filter(visit => {
                                const visitDate = new Date(visit.timestamp);
                                return visitDate >= campaignStartDate && visitDate <= campaignEndDate;
                            });
                            const campaignClicks = analytics.clicks.filter(click => {
                                const clickDate = new Date(click.timestamp);
                                return clickDate >= campaignStartDate && clickDate <= campaignEndDate;
                            });
                            const abandonedCampaignVisits = campaignVisits.length - new Set(campaignClicks.map(c => c.ip)).size;
                            const followedClicks = campaignClicks.length;

                            statsContainer.innerHTML = `
                                <h4>Stats for ${campaign.name}</h4>
                                <p>Total Visits: ${campaignVisits.length}</p>
                                <p>Followed Links: ${followedClicks}</p>
                                <p>Abandoned Visits: ${abandonedCampaignVisits}</p>
                                <div style="height: 200px; margin-top: 20px;"><canvas id="campaign-chart-${campaign.id}"></canvas></div>
                            `;

                            new Chart(document.getElementById(`campaign-chart-${campaign.id}`), {
                                type: 'bar',
                                data: {
                                    labels: ['Engagement'],
                                    datasets: [
                                        {
                                            label: 'Followed Links',
                                            data: [followedClicks],
                                            backgroundColor: config.theme.secondaryColor
                                        },
                                        {
                                            label: 'Abandoned Visits',
                                            data: [abandonedCampaignVisits],
                                            backgroundColor: config.theme.primaryColor
                                        }
                                    ]
                                },
                                options: {
                                    indexAxis: 'y',
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    scales: { x: { stacked: true }, y: { stacked: true } }
                                }
                            });
                        });
                }
            });
        });
    }

    function renderAnalyticsTab(config) {
        adminContentDiv.innerHTML = `
            <div id="analytics-tab" class="tab-content active">
                <h2>Analytics</h2>
                <p style="font-size: 0.9rem; color: #606770;">
                    Here you can find the analytics data for your tenant. Use the filters to select the data you want to see.
                </p>
                <div id="analytics-filters">
                    <label>Tenant: 
                        <select id="tenant-filter">
                            <option value="">All Tenants</option>
                        </select>
                    </label>
                    <label>Campaign: 
                        <select id="campaign-filter">
                            <option value="">All Campaigns</option>
                        </select>
                    </label>
                    <label>Date Range: 
                        <input type="date" id="start-date-filter">
                        to
                        <input type="date" id="end-date-filter">
                    </label>
                    <button id="apply-filters">Apply Filters</button>
                </div>
                <div id="analytics-results"></div>
            </div>
        `;

        const tenantFilter = document.getElementById('tenant-filter');
        const campaignFilter = document.getElementById('campaign-filter');
        const startDateFilter = document.getElementById('start-date-filter');
        const endDateFilter = document.getElementById('end-date-filter');
        const analyticsResults = document.getElementById('analytics-results');

        // Load tenants for filter
        fetch('/api/tenants')
            .then(res => res.json())
            .then(tenants => {
                tenants.forEach(tenant => {
                    const option = document.createElement('option');
                    option.value = tenant.name;
                    option.textContent = `${tenant.displayName} (${tenant.name})`;
                    tenantFilter.appendChild(option);
                });
            });

        // Load campaigns for filter
        fetch('/api/admin/config')
            .then(res => res.json())
            .then(config => {
                config.campaigns.forEach(campaign => {
                    const option = document.createElement('option');
                    option.value = campaign.id;
                    option.textContent = campaign.name;
                    campaignFilter.appendChild(option);
                });
            });

        document.getElementById('apply-filters').addEventListener('click', () => {
            const tenantId = tenantFilter.value;
            const campaignId = campaignFilter.value;
            const startDate = startDateFilter.value;
            const endDate = endDateFilter.value;

            fetch('/api/analytics')
                .then(response => response.json())
                .then(analytics => {
                    let filteredVisits = analytics.visits;
                    let filteredClicks = analytics.clicks;

                    // Apply tenant filter
                    if (tenantId) {
                        filteredVisits = filteredVisits.filter(visit => visit.tenantId === tenantId);
                        filteredClicks = filteredClicks.filter(click => click.tenantId === tenantId);
                    }

                    // Apply campaign filter
                    if (campaignId) {
                        filteredVisits = filteredVisits.filter(visit => visit.campaignId === campaignId);
                        filteredClicks = filteredClicks.filter(click => click.campaignId === campaignId);
                    }

                    // Apply date range filter
                    if (startDate) {
                        filteredVisits = filteredVisits.filter(visit => new Date(visit.timestamp) >= new Date(startDate));
                        filteredClicks = filteredClicks.filter(click => new Date(click.timestamp) >= new Date(startDate));
                    }
                    if (endDate) {
                        filteredVisits = filteredVisits.filter(visit => new Date(visit.timestamp) <= new Date(endDate));
                        filteredClicks = filteredClicks.filter(click => new Date(click.timestamp) <= new Date(endDate));
                    }

                    // Group by date
                    const visitsByDate = {};
                    const clicksByDate = {};
                    filteredVisits.forEach(visit => {
                        const date = new Date(visit.timestamp).toISOString().split('T')[0];
                        if (!visitsByDate[date]) {
                            visitsByDate[date] = 0;
                        }
                        visitsByDate[date]++;
                    });
                    filteredClicks.forEach(click => {
                        const date = new Date(click.timestamp).toISOString().split('T')[0];
                        if (!clicksByDate[date]) {
                            clicksByDate[date] = 0;
                        }
                        clicksByDate[date]++;
                    });

                    // Prepare data for chart
                    const chartData = {
                        labels: Object.keys(visitsByDate),
                        datasets: [
                            {
                                label: 'Visits',
                                data: Object.values(visitsByDate),
                                backgroundColor: config.theme.primaryColor
                           