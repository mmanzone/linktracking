document.addEventListener('DOMContentLoaded', () => {
    const adminPanelDiv = document.getElementById('admin-panel');
    const adminContentDiv = document.getElementById('admin-content');
    const tabsContainer = document.querySelector('.tabs');
    const tenantSwitcher = document.getElementById('tenant-switcher');
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
            
            document.getElementById('admin-title').textContent = `${currentTenant.displayName} - Admin Panel`;
            
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
            
            // Re-add event listeners to tabs
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
        // We need the config for most tabs, but not for the tenants tab
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
                    case 'users':
                        renderUsersTab();
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
                <div id="users-list"></div>
                ${!isAdmin ? `
                <h3>Invite New User</h3>
                <form id="invite-user-form">
                    <label>Email: <input type="email" id="invite-email-input" required></label>
                    <button type="submit">Send Invite</button>
                </form>
                ` : ''}
            </div>
        `;

        const usersList = document.getElementById('users-list');
        fetch(userApiUrl)
            .then(res => res.json())
            .then(users => {
                users.forEach(user => {
                    const userEl = document.createElement('div');
                    userEl.classList.add('user-admin-row');
                    userEl.dataset.userId = user.id;
                    userEl.innerHTML = `
                        <span>${user.firstName || ''} ${user.lastName || ''} (${user.email}) - Last Login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'} ${user.disabled ? '(Disabled)' : ''}</span>
                        <div>
                            <button class="edit-user">Edit</button>
                            <button class="delete-user">Delete</button>
                        </div>
                    `;
                    usersList.appendChild(userEl);
                });
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
                        <input type="text" class="edit-firstName" value="${user.firstName || ''}" placeholder="First Name">
                        <input type="text" class="edit-lastName" value="${user.lastName || ''}" placeholder="Last Name">
                        <input type="email" class="edit-email" value="${user.email}">
                        <label><input type="checkbox" class="edit-disabled" ${user.disabled ? 'checked' : ''}> Disabled</label>
                        <button class="save-user" data-id="${user.id}">Save</button>
                        <button class="cancel-edit">Cancel</button>
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
                }).then(() => loadAdminContent('users'));
            }
            if (e.target.classList.contains('cancel-edit')) {
                loadAdminContent('users');
            }
        });

        if (!isAdmin) {
            document.getElementById('invite-user-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('invite-email-input').value;
                fetch('/api/users/invite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                }).then(() => {
                    document.getElementById('invite-email-input').value = '';
                    alert('Invite sent!');
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
                <label>Background Color: 
                    <input type="color" id="bg-color-picker" value="${config.theme.backgroundColor || '#f0f2f5'}">
                    <input type="text" id="bg-color-input" value="${config.theme.backgroundColor || '#f0f2f5'}" size="7">
                </label><br>
                <label>Container Color: 
                    <input type="color" id="container-color-picker" value="${config.theme.containerColor || '#ffffff'}">
                    <input type="text" id="container-color-input" value="${config.theme.containerColor || '#ffffff'}" size="7">
                </label><br>
                <label>Primary Color (Header): 
                    <input type="color" id="primary-color-picker" value="${config.theme.primaryColor}">
                    <input type="text" id="primary-color-input" value="${config.theme.primaryColor}" size="7">
                </label>
                <label>Text Color: 
                    <input type="color" id="primary-text-color-picker" value="${config.theme.primaryTextColor || '#000000'}">
                    <input type="text" id="primary-text-color-input" value="${config.theme.primaryTextColor || '#000000'}" size="7">
                </label><br>
                <label>Secondary Color (Links): 
                    <input type="color" id="secondary-color-picker" value="${config.theme.secondaryColor}">
                    <input type="text" id="secondary-color-input" value="${config.theme.secondaryColor}" size="7">
                </label>
                <label>Text Color: 
                    <input type="color" id="secondary-text-color-picker" value="${config.theme.secondaryTextColor || '#000000'}">
                    <input type="text" id="secondary-text-color-input" value="${config.theme.secondaryTextColor || '#000000'}" size="7">
                </label><br>
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

        // QR Code Generation
        const tenantUrl = `${window.location.origin}/${currentTenant.name}`;
        
        const qrCodeStandard = new QRCode(document.getElementById("qrcode-standard"), {
            text: tenantUrl,
            width: 256,
            height: 256,
            colorDark : config.theme.primaryColor,
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });

        const qrCodeLogo = new QRCode(document.getElementById("qrcode-logo"), {
            text: tenantUrl,
            width: 256,
            height: 256,
            colorDark : config.theme.primaryColor,
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H,
            logo: config.logo,
            logoWidth: 64,
            logoHeight: 64,
            logoBackgroundColor: '#ffffff',
            logoBackgroundTransparent: false
        });

        // Add Download Buttons
        document.getElementById('download-standard').addEventListener('click', () => {
            const canvas = document.querySelector('#qrcode-standard canvas');
            const link = document.createElement('a');
            link.download = 'qrcode-standard.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
        document.getElementById('download-logo').addEventListener('click', () => {
            const canvas = document.querySelector('#qrcode-logo canvas');
            const link = document.createElement('a');
            link.download = 'qrcode-logo.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });


        // Theme color pickers synchronization
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

        document.getElementById('add-social-link').addEventListener('click', () => {
            const newConfig = { ...config };
            newConfig.socialLinks.push({ name: 'facebook', url: '' });
            saveConfig(newConfig).then(() => renderGeneralTab(newConfig));
        });

        socialLinksAdmin.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-social')) {
                const index = parseInt(e.target.dataset.index, 10);
                const newConfig = { ...config };
                newConfig.socialLinks.splice(index, 1);
                saveConfig(newConfig).then(() => renderGeneralTab(newConfig));
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
                            newLogoFile = null; // Reset after successful save
                            loadAdminContent('general'); // Reload to update QR code
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
                // No new logo, just save the text content and existing logo URL
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
                <div id="links-list"></div>
                <button id="add-link">Add New Link</button>
            </div>
        `;

        const linksList = document.getElementById('links-list');

        config.links.forEach((link, index) => {
            const linkElement = document.createElement('div');
            linkElement.classList.add('link-admin');
            linkElement.dataset.id = link.id;
            linkElement.innerHTML = `
                <div class="link-order">
                    <button class="move-up" ${index === 0 ? 'disabled' : ''}>▲</button>
                    <button class="move-down" ${index === config.links.length - 1 ? 'disabled' : ''}>▼</button>
                </div>
                <div>
                    <img src="${link.icon}" style="width: 40px; height: 40px; vertical-align: middle;">
                    <input type="file" class="link-icon-upload" style="display: none;">
                    <button class="change-icon" title="Change Icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    </button>
                </div>
                <input type="text" class="link-text-edit" value="${link.text}" placeholder="Link Name">
                <input type="text" class="link-url-edit" value="${link.url}" placeholder="https://...">
                <button class="hide-link">${link.visible ? 'Hide' : 'Show'}</button>
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

            if (event.target.classList.contains('hide-link')) {
                newConfig.links[linkIndex].visible = !newConfig.links[linkIndex].visible;
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
                        // Provide visual feedback during upload
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
                            linkAdmin.innerHTML = originalHtml; // Restore original content on failure
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
        
        document.getElementById('add-campaign').addEventListener('click', () => {
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
                    links: config.links.map(l => l.id) // Default to all links
                });
                saveConfig(newConfig).then(() => loadAdminContent('campaigns'));
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
                    newEndDate.setHours(23, 59, 59, 999); // Set to end of day

                    // Overlap check
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
                    
                    // Correctly sort links: ordered campaign links first, then the rest
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
                            <div class="link" style="background-color: ${config.theme.secondaryColor}; color: ${config.theme.secondaryTextColor || 'black'};">
                                <img src="${link.icon}" alt="${link.text}">
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
                            <div class="campaign-links-edit">${campaignLinksHtml}</div>
                            <div class="button-container">
                                <button class="save-edit-campaign">Save</button>
                                <button class="cancel-edit-campaign">Cancel</button>
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

                if (event.target.classList.contains('delete-campaign')) {
                    if (confirm('Are you sure you want to delete this campaign?')) {
                        fetch('/api/admin/config').then(res => res.json()).then(config => {
                            let newConfig = { ...config };
                            newConfig.campaigns = newConfig.campaigns.filter(c => c.id !== campaignId);
                            saveConfig(newConfig).then(() => loadAdminContent('campaigns'));
                        });
                    }
                }
            });
        });
    }

    function renderAnalyticsTab(config) {
        let tenantFilter = '';
        if (currentUser.role === 'master-admin') {
            tenantFilter = `
                <select id="tenant-analytics-filter">
                    <option value="">All Tenants</option>
                </select>
            `;
        }

        adminContentDiv.innerHTML = `
            <div id="analytics-tab" class="tab-content active">
                <h2>Analytics</h2>
                <p style="font-size: 0.9rem; color: #606770;">
                    Shows the total number of visitors to the landing page, i.e. people who have opened the landing page using the QR code or not. "Abandoned" shows people who did not go further than the landing page and didn't click on a link. "Followed links" show the actual link or links they followed. One visitor might click on multiple links. 
                    You can choose to see the results per day using the date filter, or per specific campaign (those will filter by campaign date automatically). If you want the total number of the period, instead of a day-by-day breakdown, click the "Cumulative" checkbox. 
                    The visitors by hour show the time of the day the visitor opened the page, cumulative over the days in the time period. This highlights the busier engagement period during a campaign for example.
                </p>
                <div id="analytics-filters" style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                    ${tenantFilter}
                    <select id="date-filter">
                        <option value="30">Last 30 days</option>
                        <option value="7">Last 7 days</option>
                        <option value="1">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="90">Last 3 months</option>
                        <option value="180">Last 6 months</option>
                        <option value="365">Last 12 months</option>
                        <option value="all">All time</option>
                    </select>
                    <select id="campaign-filter"></select>
                    <label><input type="checkbox" id="cumulative-checkbox"> Cumulative</label>
                    <button id="export-analytics">Export Graphs</button>
                    <button id="refresh-analytics" title="Refresh Data">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                    </button>
                </div>
                <div id="analytics-charts">
                    <h3>Visitor Engagement</h3>
                    <div style="height: 200px; margin-bottom: 20px;"><canvas id="visits-chart"></canvas></div>
                    <h3>Clicks per Link</h3>
                    <div style="height: 400px; margin-bottom: 20px;"><canvas id="clicks-chart"></canvas></div>
                    <h3>Visitors by Hour</h3>
                    <div style="height: 300px; margin-bottom: 20px;"><canvas id="hourly-chart"></canvas></div>
                </div>
                <small>All times are in Australia/Sydney timezone.</small>
            </div>
        `;
        
        if (currentUser.role === 'master-admin') {
            const tenantAnalyticsFilter = document.getElementById('tenant-analytics-filter');
            fetch('/api/tenants')
                .then(res => res.json())
                .then(tenants => {
                    tenants.forEach(tenant => {
                        tenantAnalyticsFilter.innerHTML += `<option value="${tenant.id}">${tenant.displayName}</option>`;
                    });
                });
        }


        document.getElementById('export-analytics').addEventListener('click', () => {
            const chartsContainer = document.getElementById('analytics-charts');
            html2canvas(chartsContainer).then(canvas => {
                const link = document.createElement('a');
                link.download = 'analytics-export.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        });

        const dateFilter = document.getElementById('date-filter');
        const campaignFilter = document.getElementById('campaign-filter');
        const cumulativeCheckbox = document.getElementById('cumulative-checkbox');
        const refreshButton = document.getElementById('refresh-analytics');

        refreshButton.addEventListener('click', () => {
            fetchAnalyticsData();
        });
        
        const fetchAnalyticsData = () => {
            let url = '/api/analytics';
            if (currentUser.role === 'master-admin') {
                const tenantId = document.getElementById('tenant-analytics-filter').value;
                url = `/api/admin/analytics?tenantId=${tenantId}`;
            }
            
            fetch(url)
                .then(response => response.json())
                .then(analytics => {
                    let allConfigs = null;
                    if (currentUser.role === 'master-admin' && !document.getElementById('tenant-analytics-filter').value) {
                        // Fetch all configs to resolve link names
                        fetch('/api/admin/all-configs')
                            .then(res => res.json())
                            .then(configs => {
                                allConfigs = configs;
                                processAnalytics(analytics, allConfigs);
                            });
                    } else {
                        processAnalytics(analytics);
                    }
                });
        };

        const processAnalytics = (analytics, allConfigs = null) => {
            let processedAnalytics = analytics;
            if (currentUser.role === 'master-admin' && !document.getElementById('tenant-analytics-filter').value) {
                // Aggregate data from all tenants
                processedAnalytics = Object.values(analytics).reduce((acc, tenantAnalytics) => {
                    if (tenantAnalytics) {
                        acc.visits.push(...tenantAnalytics.visits);
                        acc.clicks.push(...tenantAnalytics.clicks);
                    }
                    return acc;
                }, { visits: [], clicks: [] });
            }
            filterAnalyticsData(processedAnalytics, allConfigs);
        };

        const getSydneyHour = (utcIsoString) => {
            const date = new Date(utcIsoString);
            // A reliable way to get the hour in a specific timezone
            const sydneyTime = new Date(date.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
            return sydneyTime.getHours();
        };

        const updateAnalyticsCharts = (analyticsData) => {
            // Clear previous charts
            const visitsChartCanvas = document.getElementById('visits-chart');
            const clicksChartCanvas = document.getElementById('clicks-chart');
            const hourlyChartCanvas = document.getElementById('hourly-chart');
            if (visitsChartCanvas.chart) visitsChartCanvas.chart.destroy();
            if (clicksChartCanvas.chart) clicksChartCanvas.chart.destroy();
            if (hourlyChartCanvas.chart) hourlyChartCanvas.chart.destroy();

            const isCumulative = cumulativeCheckbox.checked;

            if (isCumulative) {
                const totalVisits = analyticsData.visits.length;
                const totalClicks = analyticsData.clicks.length;
                const abandonedVisits = totalVisits - new Set(analyticsData.clicks.map(c => c.ip)).size;

                visitsChartCanvas.chart = new Chart(visitsChartCanvas, {
                    type: 'bar',
                    data: {
                        labels: ['Visitor Engagement'],
                        datasets: [
                            {
                                label: `Followed Link (${totalClicks} - ${totalVisits > 0 ? ((totalClicks / totalVisits) * 100).toFixed(1) : 0}%)`,
                                data: [totalClicks],
                                backgroundColor: config.theme.secondaryColor
                            },
                            {
                                label: `Abandoned (${abandonedVisits} - ${totalVisits > 0 ? ((abandonedVisits / totalVisits) * 100).toFixed(1) : 0}%)`,
                                data: [abandonedVisits],
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
            } else {
                // Day-by-day breakdown
                const dataByDay = {};
                analyticsData.visits.forEach(v => {
                    const day = new Date(v.timestamp).toLocaleDateString('en-CA'); // YYYY-MM-DD
                    if (!dataByDay[day]) dataByDay[day] = { visits: 0, clicks: 0 };
                    dataByDay[day].visits++;
                });
                analyticsData.clicks.forEach(c => {
                    const day = new Date(c.timestamp).toLocaleDateString('en-CA');
                    if (!dataByDay[day]) dataByDay[day] = { visits: 0, clicks: 0 };
                    dataByDay[day].clicks++;
                });

                const sortedDays = Object.keys(dataByDay).sort();
                const followedData = sortedDays.map(day => dataByDay[day].clicks);
                const abandonedData = sortedDays.map(day => dataByDay[day].visits - dataByDay[day].clicks);

                visitsChartCanvas.chart = new Chart(visitsChartCanvas, {
                    type: 'bar',
                    data: {
                        labels: sortedDays,
                        datasets: [
                            {
                                label: 'Followed Link',
                                data: followedData,
                                backgroundColor: config.theme.secondaryColor
                            },
                            {
                                label: 'Abandoned',
                                data: abandonedData,
                                backgroundColor: config.theme.primaryColor
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
                    }
                });
            }
        
            const clicksPerLink = {};
            analyticsData.clicks.forEach(click => {
                clicksPerLink[click.linkId] = (clicksPerLink[click.linkId] || 0) + 1;
            });

            const sortedLinks = Object.entries(clicksPerLink).sort(([,a],[,b]) => b-a);
            
            const getLinkName = (linkId) => {
                if (linkId.startsWith('social-')) {
                    const name = linkId.replace('social-', '');
                    return name.charAt(0).toUpperCase() + name.slice(1);
                }
                // In master admin view, we need to check all configs
                if (currentUser.role === 'master-admin' && allConfigs) {
                    for (const tenantId in allConfigs) {
                        const link = allConfigs[tenantId].links.find(l => l.id === linkId);
                        if (link) return link.text;
                    }
                }
                return config.links.find(l => l.id === linkId)?.text || 'Unknown Link';
            };

            const linkLabels = sortedLinks.map(([linkId]) => getLinkName(linkId));
            const clickCounts = sortedLinks.map(([,count]) => count);

            clicksChartCanvas.chart = new Chart(clicksChartCanvas, {
                type: 'bar',
                data: {
                    labels: linkLabels,
                    datasets: [{
                        label: 'Clicks per Link',
                        data: clickCounts,
                        backgroundColor: config.theme.secondaryColor
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                }
            });

            // Hourly visits chart
            const hourlyVisits = Array(24).fill(0);
            const hourlyClicks = Array(24).fill(0);
            analyticsData.visits.forEach(visit => {
                hourlyVisits[getSydneyHour(visit.timestamp)]++;
            });
            analyticsData.clicks.forEach(click => {
                hourlyClicks[getSydneyHour(click.timestamp)]++;
            });

            hourlyChartCanvas.chart = new Chart(hourlyChartCanvas, {
                type: 'bar',
                data: {
                    labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                    datasets: [
                        {
                            label: 'Followed Links',
                            data: hourlyClicks,
                            backgroundColor: config.theme.secondaryColor
                        },
                        {
                            label: 'Abandoned Visits',
                            data: hourlyVisits.map((v, i) => v - (hourlyClicks[i] || 0)),
                            backgroundColor: config.theme.primaryColor
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { 
                        x: { stacked: true },
                        y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } } 
                    }
                }
            });
        };

        const filterAnalyticsData = (analytics) => {
            const selectedDateFilter = dateFilter.value;
            const selectedCampaignFilter = campaignFilter.value;

            let filteredAnalytics = { visits: [...analytics.visits], clicks: [...analytics.clicks] };

            // Filter by date
            const now = new Date();
            let startDate = new Date();
            let endDate = new Date(); // Use a separate end date

            if (selectedDateFilter === 'all') {
                startDate = new Date(0);
            } else if (selectedDateFilter === 'yesterday') {
                startDate.setDate(now.getDate() - 1);
                startDate.setHours(0, 0, 0, 0);
                endDate.setDate(now.getDate() - 1);
                endDate.setHours(23, 59, 59, 999);
            } else if (selectedDateFilter === '1') { // Today
                startDate.setHours(0, 0, 0, 0);
            } else {
                startDate.setDate(now.getDate() - parseInt(selectedDateFilter));
            }
            
            filteredAnalytics.visits = filteredAnalytics.visits.filter(v => {
                const visitDate = new Date(v.timestamp);
                return visitDate >= startDate && visitDate <= endDate;
            });
            filteredAnalytics.clicks = filteredAnalytics.clicks.filter(c => {
                const clickDate = new Date(c.timestamp);
                return clickDate >= startDate && clickDate <= endDate;
            });

            // Populate campaign filter based on date filter
            const currentCampaignSelection = campaignFilter.value;
            campaignFilter.innerHTML = '<option value="all">All Campaigns</option>';
            config.campaigns.forEach(c => {
                if (new Date(c.endDate) >= startDate) {
                    campaignFilter.innerHTML += `<option value="${c.id}">${c.name}</option>`;
                }
            });
            campaignFilter.value = currentCampaignSelection;

            // Filter by campaign
            if (campaignFilter.value !== 'all') {
                const campaign = config.campaigns.find(c => c.id === campaignFilter.value);
                if (campaign) {
                    const campaignStart = new Date(campaign.startDate);
                    const campaignEnd = new Date(campaign.endDate);
                    filteredAnalytics.visits = filteredAnalytics.visits.filter(v => new Date(v.timestamp) >= campaignStart && new Date(v.timestamp) <= campaignEnd);
                    filteredAnalytics.clicks = filteredAnalytics.clicks.filter(c => new Date(c.timestamp) >= campaignStart && new Date(c.timestamp) <= campaignEnd);
                }
            }

            updateAnalyticsCharts(filteredAnalytics);
        };

        const filterAndRender = () => fetchAnalyticsData();
        dateFilter.addEventListener('change', filterAndRender);
        campaignFilter.addEventListener('change', filterAndRender);
        cumulativeCheckbox.addEventListener('change', filterAndRender);
        if (currentUser.role === 'master-admin') {
            document.getElementById('tenant-analytics-filter').addEventListener('change', filterAndRender);
        }
        filterAndRender(); // Initial load
    }

    function showSaveConfirmation(button) {
        const originalText = button.textContent;
        button.textContent = 'Saved!';
        button.style.backgroundColor = '#28a745';
        setTimeout(() => {
            button.textContent = originalText;
            button.style.backgroundColor = '#007bff';
        }, 2000);
    }

    function saveConfig(config, button) {
        return fetch('/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        }).then(res => {
            if (res.ok && button) {
                showSaveConfirmation(button);
            }
            return res;
        });
    }
});