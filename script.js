// Configuration
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
let apiKey = localStorage.getItem('mistral_api_key') || '';

// Initialisation
document.getElementById('apiKey').value = apiKey;

function saveApiKey() {
    apiKey = document.getElementById('apiKey').value;
    localStorage.setItem('mistral_api_key', apiKey);
    alert('Clé API sauvegardée !');
}

async function generateSite() {
    const description = document.getElementById('description').value;
    const style = document.getElementById('style').value;
    const framework = document.getElementById('framework').value;
    
    if (!apiKey) {
        alert('Veuillez entrer votre clé API Mistral');
        return;
    }
    
    if (!description) {
        alert('Veuillez décrire votre site');
        return;
    }

    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = true;
    generateBtn.textContent = 'Génération en cours... 🤖';

    try {
        const prompt = createPrompt(description, style, framework);
        const htmlCode = await callMistralAPI(prompt);
        
        // Afficher la prévisualisation
        document.getElementById('previewSection').style.display = 'block';
        
        // Mettre à jour l'iframe
        const frame = document.getElementById('previewFrame');
        frame.srcdoc = htmlCode;
        
        // Afficher le code
        document.getElementById('generatedCode').textContent = htmlCode;
        
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la génération: ' + error.message);
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Générer le site ✨';
    }
}

function createPrompt(description, style, framework) {
    return `Tu es un développeur web expert. Crée un site web complet en HTML, CSS et JavaScript selon cette description : "${description}"

Style demandé : ${style}
Framework : ${framework}

Instructions importantes :
1. Génère UN SEUL fichier HTML contenant tout le CSS dans <style> et tout le JS dans <script>
2. Le code doit être responsive et moderne
3. Utilise des couleurs harmonieuses et une bonne typographie
4. Ajoute des animations subtiles et des effets hover
5. Le code doit être fonctionnel et prêt à l'emploi
6. Utilise des icônes Unicode ou SVG quand c'est pertinent
7. Assure-toi que tous les liens et boutons sont interactifs
8. N'utilise PAS de CDN ou ressources externes sauf si demandé

${framework === 'bootstrap' ? 'Utilise Bootstrap 5 via CDN' : ''}
${framework === 'tailwind' ? 'Utilise Tailwind CSS via CDN' : ''}

Réponds UNIQUEMENT avec le code HTML complet, sans explications.`;
}

async function callMistralAPI(prompt) {
    const response = await fetch(MISTRAL_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'mistral-large-latest',
            messages: [
                {
                    role: 'system',
                    content: 'Tu es un développeur web expert qui crée du code HTML/CSS/JS propre et moderne.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 4000
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Erreur API');
    }

    const data = await response.json();
    let code = data.choices[0].message.content;
    
    // Nettoyer le code si nécessaire
    code = code.replace(/```html\n?/g, '').replace(/```\n?/g, '');
    
    return code;
}

function showTab(tabName) {
    // Gérer les onglets
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    
    event.target.classList.add('active');
    document.getElementById(tabName).style.display = tabName === 'preview' ? 'block' : 'block';
}

function copyCode() {
    const code = document.getElementById('generatedCode').textContent;
    navigator.clipboard.writeText(code).then(() => {
        alert('Code copié dans le presse-papier !');
    });
}

function downloadSite() {
    const code = document.getElementById('generatedCode').textContent;
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'site-genere.html';
    a.click();
    URL.revokeObjectURL(url);
}// Configuration GitHub
let githubToken = localStorage.getItem('github_token') || '';
let githubUsername = localStorage.getItem('github_username') || '';
let githubRepo = localStorage.getItem('github_repo') || ''; // 'mon-depot-sites'

// Nouvelles fonctions GitHub
function configureGitHub() {
    const token = prompt('Token GitHub (classic) :');
    if (token) {
        githubToken = token;
        localStorage.setItem('github_token', token);
    }
    
    const username = prompt('Votre nom d\'utilisateur GitHub :');
    if (username) {
        githubUsername = username;
        localStorage.setItem('github_username', username);
    }
    
    const repo = prompt('Nom du dépôt (créez-le d\'abord sur GitHub) :', 'sites-generes');
    if (repo) {
        githubRepo = repo;
        localStorage.setItem('github_repo', repo);
    }
    
    alert('Configuration GitHub enregistrée !');
}

async function deployToGitHub() {
    if (!githubToken || !githubUsername || !githubRepo) {
        alert('Veuillez d\'abord configurer GitHub');
        configureGitHub();
        return;
    }
    
    const code = document.getElementById('generatedCode').textContent;
    if (!code) {
        alert('Générez d\'abord un site !');
        return;
    }
    
    const deployBtn = document.getElementById('deployBtn');
    deployBtn.disabled = true;
    deployBtn.textContent = 'Déploiement en cours...';
    
    try {
        // 1. Créer un nom unique pour le site
        const siteName = `site-${Date.now()}`;
        const indexPath = `sites/${siteName}/index.html`;
        
        // 2. Vérifier si la branche gh-pages existe
        const branchExists = await checkBranch('gh-pages');
        
        // 3. Créer la branche gh-pages si nécessaire
        if (!branchExists) {
            await createGhPagesBranch();
        }
        
        // 4. Upload du fichier
        await uploadFile(indexPath, code);
        
        // 5. Activer GitHub Pages si pas déjà fait
        await enableGitHubPages();
        
        // 6. Construire l'URL
        const siteUrl = `https://${githubUsername}.github.io/${githubRepo}/sites/${siteName}`;
        
        // 7. Afficher le résultat
        showDeployResult(siteUrl);
        
    } catch (error) {
        console.error('Erreur de déploiement:', error);
        alert('Erreur lors du déploiement: ' + error.message);
    } finally {
        deployBtn.disabled = false;
        deployBtn.textContent = 'Héberger sur GitHub';
    }
}

async function checkBranch(branch) {
    const response = await fetch(
        `https://api.github.com/repos/${githubUsername}/${githubRepo}/branches/${branch}`,
        {
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        }
    );
    return response.ok;
}

async function createGhPagesBranch() {
    // Créer une branche gh-pages vide
    const mainBranch = await getDefaultBranch();
    
    // Obtenir le SHA du dernier commit de la branche principale
    const refResponse = await fetch(
        `https://api.github.com/repos/${githubUsername}/${githubRepo}/git/refs/heads/${mainBranch}`,
        {
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        }
    );
    const refData = await refResponse.json();
    const sha = refData.object.sha;
    
    // Créer la branche gh-pages
    await fetch(
        `https://api.github.com/repos/${githubUsername}/${githubRepo}/git/refs`,
        {
            method: 'POST',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ref: 'refs/heads/gh-pages',
                sha: sha
            })
        }
    );
}

async function getDefaultBranch() {
    const response = await fetch(
        `https://api.github.com/repos/${githubUsername}/${githubRepo}`,
        {
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        }
    );
    const data = await response.json();
    return data.default_branch;
}

async function uploadFile(path, content) {
    const response = await fetch(
        `https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/${path}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Ajout du site: ${path}`,
                content: btoa(unescape(encodeURIComponent(content))),
                branch: 'gh-pages'
            })
        }
    );
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de l\'upload');
    }
    
    return await response.json();
}

async function enableGitHubPages() {
    // Vérifier si GitHub Pages est déjà activé
    const checkResponse = await fetch(
        `https://api.github.com/repos/${githubUsername}/${githubRepo}/pages`,
        {
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        }
    );
    
    if (checkResponse.status === 404) {
        // Activer GitHub Pages
        await fetch(
            `https://api.github.com/repos/${githubUsername}/${githubRepo}/pages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    source: {
                        branch: 'gh-pages',
                        path: '/'
                    }
                })
            }
        );
    }
}

function showDeployResult(url) {
    const resultDiv = document.createElement('div');
    resultDiv.className = 'deploy-result';
    resultDiv.innerHTML = `
        <h3>✅ Site déployé avec succès !</h3>
        <p>Votre site est accessible à l'adresse :</p>
        <div class="url-box">
            <a href="${url}" target="_blank">${url}</a>
            <button onclick="copyUrl('${url}')">📋 Copier</button>
        </div>
        <p class="note">⏱️ Le déploiement peut prendre 1-2 minutes</p>
    `;
    
    const previewSection = document.getElementById('previewSection');
    const existingResult = previewSection.querySelector('.deploy-result');
    if (existingResult) {
        existingResult.remove();
    }
    previewSection.appendChild(resultDiv);
}

function copyUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert('URL copiée !');
    });
}
