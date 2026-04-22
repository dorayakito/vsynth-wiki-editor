const saveSound = new Audio('save.mp3');

function playSave() {
    saveSound.currentTime = 0;
    saveSound.play().catch(() => { });
}

function toggleTutorial() {
    const panel = document.getElementById('tutorialPanel');
    panel.classList.toggle('show');
}

function openModal(src) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    modalImg.src = src;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden'; 
}

function closeModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto'; 
}

let isLightTheme = false;

function toggleCodeTheme() {
    const outputContent = document.querySelector('.output-content');
    const themeBtn = document.querySelector('.btn-theme i');

    isLightTheme = !isLightTheme;
    outputContent.classList.toggle('light-theme', isLightTheme);

    themeBtn.className = isLightTheme ? 'fi fi-rr-moon' : 'fi fi-rr-sun';
}

document.documentElement.classList.remove('light-mode');
localStorage.setItem('darkMode', 'true');

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const currentActive = document.querySelector('.tab.active');
        if (currentActive === tab) return;

        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const targetId = tab.dataset.tab;
        document.querySelectorAll('.form-section').forEach(s => {
            s.classList.remove('active');
        });
        document.getElementById(targetId).classList.add('active');
    });
});

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = type === 'success' ? 'fi-rr-check' : 'fi-rr-triangle-warning';

    toast.innerHTML = `<i class="fi ${icon}"></i> <span>${message}</span>`;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.toggle('active', show);
}

async function importarPagina() {
    const urlInput = document.getElementById('importUrl').value.trim();

    if (!urlInput) {
        showToast('Cole um link da wiki primeiro!', 'error');
        return;
    }

    let pageName = '';
    try {
        const url = new URL(urlInput);
        const pathParts = url.pathname.split('/wiki/');
        if (pathParts.length > 1) {
            pageName = decodeURIComponent(pathParts[1]);
        }
    } catch (e) {
        pageName = urlInput;
    }

    if (!pageName) {
        showToast('URL inválida. Use o formato: https://vsynthbr.fandom.com/pt-br/wiki/NomeDaPagina', 'error');
        return;
    }

    showLoading(true);

    try {
        const apiUrl = `https://vsynthbr.fandom.com/pt-br/api.php?action=query&titles=${encodeURIComponent(pageName)}&prop=revisions&rvprop=content&format=json&origin=*`;

        const response = await fetch(apiUrl);
        const data = await response.json();

        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];

        if (pageId === '-1') {
            showToast('Página não encontrada na wiki!', 'error');
            showLoading(false);
            return;
        }

        const content = pages[pageId].revisions[0]['*'];

        document.getElementById('codigoOutput').value = content;

        playSave();
        
        preencherFormularios(content);
        
        showToast('Página importada e campos preenchidos!', 'success');

    } catch (error) {
        console.error('Erro ao importar:', error);
        showToast('Erro ao importar página. Verifique o link.', 'error');
    }

    showLoading(false);
}

function clearExistingItems() {
    document.getElementById('imagensContainer').innerHTML = '';
    document.getElementById('bancosContainer').innerHTML = '';
    bancoCounter = 0;
    document.getElementById('exemplosContainer').innerHTML = '';
    exemploCounter = 0;
}

function preencherFormularios(content) {
    if (!content) return;

    clearExistingItems();

    const extract = (key) => {
        const regex = new RegExp(`\\|${key}\\s*=\\s*([^\\|\\}\\n]+)`, 'i');
        const match = content.match(regex);
        return match ? match[1].trim() : '';
    };

    const rawName = extract('name');
    if (rawName) {
        const parts = rawName.split(/<br\s*\/?>|<small>/i);
        document.getElementById('nome').value = parts[0].trim();
        if (parts.length > 1) {
            document.getElementById('nomeJapones').value = parts[1].replace(/<\/small>/i, '').trim();
        }
    }

    const mapping = {
        'gênero': 'genero',
        'idade': 'idade',
        'altura': 'altura',
        'peso': 'peso',
        'aniversário': 'aniversario',
        'lançamento_inicial': 'lancamento',
        'criador': 'criador',
        'voicer': 'voicer',
        'ilustradores': 'ilustrador',
        'grupo': 'grupo',
        'código': 'codigoId',
        'status': 'status',
        'website': 'siteOficial',
        'theme': 'corTema'
    };

    for (const [wikiKey, fieldId] of Object.entries(mapping)) {
        const val = extract(wikiKey);
        const element = document.getElementById(fieldId);
        if (element && val) {
            element.value = val;
        }
    }

    const galleryMatch = content.match(/image\s*=\s*<gallery>([\s\S]*?)<\/gallery>/i);
    if (galleryMatch) {
        const lines = galleryMatch[1].split('\n');
        lines.forEach(line => {
            const parts = line.trim().split('|');
            if (parts[0] && parts[0].includes('.')) {
                const container = document.getElementById('imagensContainer');
                const item = document.createElement('div');
                item.className = 'imagem-item';
                item.innerHTML = `
                    <input type="text" class="imagem-arquivo" value="${parts[0].trim()}" oninput="atualizarPreview()">
                    <input type="text" class="imagem-label" value="${parts[1] ? parts[1].trim() : ''}" oninput="atualizarPreview()">
                    <button class="btn-icon btn-remove" onclick="removerItem(this)" title="Remover"><i class="fi fi-rr-cross-small"></i></button>
                `;
                container.appendChild(item);
            }
        });
    }

    atualizarPreview();
}

function removerItem(button) {
    const item = button.closest('.imagem-item, .banco-card, .exemplo-card, .galeria-item, .download-item, .curiosidade-item, .link-item');
    item.style.animation = 'cardSlideOut 0.3s ease';
    setTimeout(() => {
        item.remove();
        atualizarPreview();
    }, 250);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes cardSlideOut {
        to {
            opacity: 0;
            transform: translateX(20px);
        }
    }
`;
document.head.appendChild(style);

function adicionarImagem() {
    const container = document.getElementById('imagensContainer');
    const item = document.createElement('div');
    item.className = 'imagem-item';
    item.innerHTML = `
        <input type="text" class="imagem-arquivo" placeholder="Nome do arquivo (ex: Nome.png)" oninput="atualizarPreview()">
        <input type="text" class="imagem-label" placeholder="Label (ex: UTAU)" oninput="atualizarPreview()">
        <button class="btn-icon btn-remove" onclick="removerItem(this)" title="Remover"><i class="fi fi-rr-cross-small"></i></button>
    `;
    container.appendChild(item);
}

let bancoCounter = 0;

function adicionarBanco() {
    bancoCounter++;
    const container = document.getElementById('bancosContainer');
    const card = document.createElement('div');
    card.className = 'banco-card';
    card.innerHTML = `
        <div class="banco-card-header">
            <span class="banco-card-title"><i class="fi fi-rr-music-alt"></i> Banco de Voz #${bancoCounter}</span>
            <button class="btn-icon btn-remove" onclick="removerItem(this)" title="Remover"><i class="fi fi-rr-cross-small"></i></button>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label><i class="fi fi-rr-text"></i> Nome do Banco *</label>
                <input type="text" class="banco-nome" placeholder="Ex: -mocaccino- ou VCV Lite" oninput="atualizarPreview()">
            </div>
            <div class="form-group">
                <label><i class="fi fi-rr-laptop"></i> Plataforma</label>
                <select class="banco-plataforma" onchange="atualizarPreview()">
                    <option value="UTAU">UTAU</option>
                    <option value="OpenUtau">OpenUtau</option>
                    <option value="DeepVocal">DeepVocal</option>
                    <option value="NIAONiao">NIAONiao</option>
                    <option value="DiffSinger">DiffSinger</option>
                </select>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label><i class="fi fi-rr-folder"></i> Categoria</label>
                <select class="banco-categoria" onchange="atualizarPreview()">
                    <option value="padrao">Padrão</option>
                    <option value="adicional">Adicional</option>
                </select>
            </div>
            <div class="form-group">
                <label><i class="fi fi-rr-palette"></i> Cor Tema</label>
                <select class="banco-cor" onchange="atualizarPreview()">
                    <option value="">Mesma do personagem</option>
                    <option value="viictor">viictor</option>
                    <option value="purple5">purple5</option>
                    <option value="blue">blue</option>
                    <option value="pink">pink</option>
                    <option value="red">red</option>
                    <option value="green">green</option>
                </select>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label><i class="fi fi-rr-guitar"></i> Gênero Musical</label>
                <input type="text" class="banco-genero" placeholder="Ex: Pop, rock e dance" oninput="atualizarPreview()">
            </div>
            <div class="form-group">
                <label><i class="fi fi-rr-clock"></i> Tempo (BPM)</label>
                <input type="text" class="banco-tempo" placeholder="Ex: 80~220 BPM" oninput="atualizarPreview()">
            </div>
        </div>

        <div class="form-group">
            <label><i class="fi fi-rr-signal-alt-2"></i> Range Vocal</label>
            <input type="text" class="banco-range" placeholder="Ex: B2~C#5" oninput="atualizarPreview()">
        </div>

        <div class="form-group">
            <label><i class="fi fi-rr-document"></i> Detalhes *</label>
            <textarea class="banco-detalhes" rows="3" placeholder="Descrição geral do banco de voz..." oninput="atualizarPreview()"></textarea>
        </div>

        <div class="form-group">
            <label><i class="fi fi-rr-settings"></i> Fonética e Recomendações</label>
            <textarea class="banco-fonetica" rows="4" placeholder="Formato de gravação, tons, recomendações de resampler/flags..." oninput="atualizarPreview()"></textarea>
        </div>

        <div class="form-group">
            <label><i class="fi fi-rr-triangle-warning"></i> Problemas Conhecidos</label>
            <textarea class="banco-issues" rows="2" placeholder="Bugs ou problemas conhecidos (opcional)..." oninput="atualizarPreview()"></textarea>
        </div>

        <div class="form-group">
            <label><i class="fi fi-rr-waveform-path"></i> Sample (arquivo de áudio)</label>
            <input type="text" class="banco-sample" placeholder="Ex: NOME-banco.ogg" oninput="atualizarPreview()">
        </div>
    `;
    container.appendChild(card);
}

let exemploCounter = 0;

function adicionarExemplo() {
    exemploCounter++;
    const container = document.getElementById('exemplosContainer');
    const card = document.createElement('div');
    card.className = 'exemplo-card';
    card.innerHTML = `
        <div class="exemplo-card-header">
            <span class="exemplo-card-title"><i class="fi fi-rr-music"></i> Música #${exemploCounter}</span>
            <button class="btn-icon btn-remove" onclick="removerItem(this)" title="Remover"><i class="fi fi-rr-cross-small"></i></button>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label><i class="fi fi-rr-picture"></i> Thumbnail</label>
                <input type="text" class="exemplo-imagem" placeholder="MusicIcon-Nome.jpg" oninput="atualizarPreview()">
            </div>
            <div class="form-group">
                <label><i class="fi fi-rr-palette"></i> Cor Tema</label>
                <select class="exemplo-cor" onchange="atualizarPreview()">
                    <option value="">Mesma do personagem</option>
                    <option value="viictor">viictor</option>
                    <option value="purple5">purple5</option>
                </select>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label><i class="fi fi-rr-text"></i> Título (romanizado) *</label>
                <input type="text" class="exemplo-titulo" placeholder="Ex: Darling" oninput="atualizarPreview()">
            </div>
            <div class="form-group">
                <label><i class="fi fi-rr-language"></i> Título Original</label>
                <input type="text" class="exemplo-titulo-orig" placeholder="Ex: ダーリン" oninput="atualizarPreview()">
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label><i class="fi fi-rr-microphone"></i> Cantor(es) *</label>
                <input type="text" class="exemplo-cantor" placeholder="Nome do banco de voz" oninput="atualizarPreview()">
            </div>
            <div class="form-group">
                <label><i class="fi fi-rr-user-pen"></i> Produtor *</label>
                <input type="text" class="exemplo-produtor" placeholder="Nome do produtor" oninput="atualizarPreview()">
            </div>
        </div>

        <div class="form-group">
            <label><i class="fi fi-rr-comment-alt"></i> Descrição</label>
            <input type="text" class="exemplo-descricao" placeholder="Ex: Lançamento do banco -basic-" oninput="atualizarPreview()">
        </div>

        <div class="form-group">
            <label><i class="fi fi-rr-link-alt"></i> Links</label>
            <div class="form-row">
                <input type="text" class="exemplo-yt" placeholder="ID do YouTube (ex: AJerKNqem2E)" oninput="atualizarPreview()">
                <input type="text" class="exemplo-nn" placeholder="ID NicoNico (ex: sm12345)" oninput="atualizarPreview()">
            </div>
            <div style="margin-top: 0.5rem;">
                <input type="text" class="exemplo-sc" placeholder="Link SoundCloud completo ou path" oninput="atualizarPreview()">
            </div>
        </div>
    `;
    container.appendChild(card);
}

function adicionarImgGaleria(tipo) {
    const containerId = {
        'oficial': 'galeriaOficialContainer',
        'covers': 'galeriaCoversContainer',
        'refs': 'galeriaRefsContainer',
        'extras': 'galeriaExtrasContainer'
    }[tipo];

    const container = document.getElementById(containerId);
    const item = document.createElement('div');
    item.className = 'galeria-item';
    item.innerHTML = `
        <input type="text" class="galeria-arquivo" placeholder="Arquivo:Nome.png" oninput="atualizarPreview()">
        <input type="text" class="galeria-descricao" placeholder="Descrição" oninput="atualizarPreview()">
        <input type="text" class="galeria-artista" placeholder="Artista" oninput="atualizarPreview()">
        <button class="btn-icon btn-remove" onclick="removerItem(this)" title="Remover"><i class="fi fi-rr-cross-small"></i></button>
    `;
    container.appendChild(item);
}

function adicionarDownload() {
    const container = document.getElementById('downloadsContainer');
    const item = document.createElement('div');
    item.className = 'download-item';
    item.innerHTML = `
        <input type="text" class="download-nome" placeholder="Nome do banco" oninput="atualizarPreview()">
        <input type="text" class="download-url" placeholder="URL" oninput="atualizarPreview()">
        <select class="download-host" onchange="toggleOutroHost(this)">
            <option value="MediaFire">MediaFire</option>
            <option value="Google Drive">Google Drive</option>
            <option value="Mega">Mega</option>
            <option value="Dropbox">Dropbox</option>
            <option value="Bowlroll">Bowlroll</option>
            <option value="__outro__">Outro...</option>
        </select>
        <input type="text" class="download-host-outro" placeholder="Nome do host" style="display: none; min-width: 100px;" oninput="atualizarPreview()">
        <button class="btn-icon btn-remove" onclick="removerItem(this)" title="Remover"><i class="fi fi-rr-cross-small"></i></button>
    `;
    container.appendChild(item);
}

function toggleOutroHost(select) {
    const item = select.closest('.download-item');
    const outroInput = item.querySelector('.download-host-outro');
    if (select.value === '__outro__') {
        outroInput.style.display = 'block';
        outroInput.focus();
    } else {
        outroInput.style.display = 'none';
        outroInput.value = '';
    }
    atualizarPreview();
}

function adicionarCuriosidade() {
    const container = document.getElementById('curiosidadesContainer');
    const item = document.createElement('div');
    item.className = 'curiosidade-item';
    item.innerHTML = `
        <input type="text" class="curiosidade-texto" placeholder="Texto da curiosidade..." style="flex: 1;" oninput="atualizarPreview()">
        <button class="btn-icon btn-remove" onclick="removerItem(this)" title="Remover"><i class="fi fi-rr-cross-small"></i></button>
    `;
    container.appendChild(item);
}

function adicionarLinkExterno() {
    const container = document.getElementById('linksExternosContainer');
    const item = document.createElement('div');
    item.className = 'link-item';
    item.innerHTML = `
        <input type="text" class="link-nome" placeholder="Nome do site" oninput="atualizarPreview()">
        <input type="text" class="link-url" placeholder="URL" oninput="atualizarPreview()">
        <button class="btn-icon btn-remove" onclick="removerItem(this)" title="Remover"><i class="fi fi-rr-cross-small"></i></button>
    `;
    container.appendChild(item);
}

let previewTimeout = null;

function atualizarPreview() {
    atualizarDesignPreview();

    clearTimeout(previewTimeout);
    previewTimeout = setTimeout(() => {
        gerarCodigo(false); 
    }, 300);
}

function atualizarDesignPreview() {
    const firstImgInput = document.querySelector('.imagem-arquivo');
    const designBody = document.getElementById('designBody');
    
    if (!firstImgInput || !designBody) return;

    const fileName = firstImgInput.value.trim();
    
    if (fileName && fileName.length > 3) {
        const imgUrl = `https://vsynthbr.fandom.com/pt-br/wiki/Especial:Redirect/file/${encodeURIComponent(fileName)}`;
        
        designBody.innerHTML = `
            <img src="${imgUrl}" alt="Design Principal" 
                 onerror="handleDesignError(this)" 
                 onload="handleDesignLoad(this)">
            <div class="design-label-overlay">${fileName}</div>
        `;
    } else {
        designBody.innerHTML = `
            <div class="design-placeholder">
                <i class="fi fi-rr-image"></i>
                <span>Aguardando nome do arquivo...</span>
            </div>
        `;
    }
}

function handleDesignError(img) {
    const designBody = document.getElementById('designBody');
    designBody.innerHTML = `
        <div class="design-placeholder">
            <i class="fi fi-rr-search-alt"></i>
            <span style="color: var(--error)">Arquivo não encontrado na wiki ou carregando...</span>
            <small style="font-size: 0.7rem; opacity: 0.7">${img.src.split('/').pop()}</small>
        </div>
    `;
}

function handleDesignLoad(img) {
    img.style.display = 'block';
}

let syncTimeout = null;
let isSyncing = false;

function sincronizarDoEditor() {
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        parsearEPreencher();
    }, 500);
}

function parsearEPreencher() {
    if (isSyncing) return;
    isSyncing = true;

    const codigo = document.getElementById('codigoOutput').value;

    const nameMatch = codigo.match(/\|name=([^<\n]+)/);
    if (nameMatch) {
        const nomeField = document.getElementById('nome');
        if (nomeField.value !== nameMatch[1].trim()) {
            nomeField.value = nameMatch[1].trim();
        }
    }

    const jpMatch = codigo.match(/\|name=[^<]*<small>([^<]+)<\/small>/);
    if (jpMatch) {
        const jpField = document.getElementById('nomeJapones');
        if (jpField.value !== jpMatch[1].trim()) {
            jpField.value = jpMatch[1].trim();
        }
    }

    const fieldMappings = {
        'gênero': 'genero',
        'idade': 'idade',
        'altura': 'altura',
        'peso': 'peso',
        'aniversário': 'aniversario',
        'lançamento_inicial': 'lancamento',
        'criador': 'criador',
        'voicer': 'voicer',
        'grupo': 'grupo',
        'código': 'codigo',
        'status': 'status',
        'website': 'website',
        'theme': 'tema'
    };

    for (const [wikiField, htmlId] of Object.entries(fieldMappings)) {
        const regex = new RegExp(`\\|${wikiField}=([^\\n\\|\\}]+)`);
        const match = codigo.match(regex);
        const element = document.getElementById(htmlId);

        if (match && element) {
            const value = match[1].trim().replace(/<br>/g, '');
            if (element.tagName === 'SELECT') {
                const options = Array.from(element.options);
                const matchingOption = options.find(opt =>
                    opt.value.toLowerCase() === value.toLowerCase() ||
                    opt.text.toLowerCase() === value.toLowerCase()
                );
                if (matchingOption && element.value !== matchingOption.value) {
                    element.value = matchingOption.value;
                }
            } else if (element.value !== value) {
                element.value = value;
            }
        }
    }

    isSyncing = false;
}

function gerarCodigo(mostrarToast = true) {
    let codigo = '';

    const temaGlobal = document.getElementById('tema').value;

    codigo += gerarInfobox(temaGlobal);

    const introducao = document.getElementById('introducao').value.trim();
    if (introducao) {
        codigo += `\n\n\n'''${document.getElementById('nome').value}'''`;
        if (document.getElementById('nomeJapones').value) {
            codigo += ` (${document.getElementById('nomeJapones').value})`;
        }
        codigo += ` ${introducao}`;
    }

    const historia = document.getElementById('historia').value.trim();
    if (historia) {
        codigo += `\n\n\n==História==\n${historia}`;
    }

    codigo += gerarConceito();

    codigo += gerarInformacoesProduto(temaGlobal);

    codigo += gerarTermosUso();

    codigo += gerarExemplosUso(temaGlobal);

    codigo += gerarDownloads();

    codigo += gerarCuriosidades();

    codigo += gerarGaleria();

    codigo += gerarLinksExternos();

    codigo += gerarCategorias();

    document.getElementById('codigoOutput').value = codigo;

    if (mostrarToast) {
        playSave();
        showToast('Código gerado com sucesso! ✨');
    }
}

function gerarInfobox(tema) {
    let infobox = '{{Character_info\n';

    const nome = document.getElementById('nome').value;
    const nomeJapones = document.getElementById('nomeJapones').value;
    if (nomeJapones) {
        infobox += `  |name=${nome}<br><small>${nomeJapones}</small>\n`;
    }

    const imagens = document.querySelectorAll('#imagensContainer .imagem-item');
    if (imagens.length > 0) {
        const imgArray = [];
        imagens.forEach(item => {
            const arquivo = item.querySelector('.imagem-arquivo').value.trim();
            const label = item.querySelector('.imagem-label').value.trim();
            if (arquivo) {
                imgArray.push(label ? `${arquivo}|${label}` : arquivo);
            }
        });

        if (imgArray.length === 1) {
            infobox += `  |image=${imgArray[0].split('|')[0]}\n`;
        } else if (imgArray.length > 1) {
            infobox += `  |image=<gallery>\n`;
            imgArray.forEach(img => {
                infobox += `${img}\n`;
            });
            infobox += `</gallery>\n`;
        }
    }

    const genero = document.getElementById('genero').value;
    if (genero) infobox += `  |gênero=${genero}\n`;

    const idade = document.getElementById('idade').value;
    if (idade) infobox += `  |idade=${idade}\n`;

    const altura = document.getElementById('altura').value;
    if (altura) infobox += `  |altura=${altura}\n`;

    const peso = document.getElementById('peso').value;
    if (peso) infobox += `  |peso=${peso}\n`;

    const aniversario = document.getElementById('aniversario').value;
    if (aniversario) infobox += `  |aniversário=${aniversario}\n`;

    infobox += `  |-\n`;

    const lancamento = document.getElementById('lancamento').value;
    if (lancamento) infobox += `  |lançamento_inicial=${lancamento}\n`;

    const criador = document.getElementById('criador').value;
    if (criador) infobox += `  |criador=${criador}\n`;

    const voicer = document.getElementById('voicer').value;
    if (voicer) infobox += `  |voicer=${voicer}\n`;

    const ilustradores = document.getElementById('ilustradores').value;
    if (ilustradores) {
        const ilus = ilustradores.split(',').map(i => i.trim()).filter(i => i);
        if (ilus.length === 1) {
            infobox += `  |ilustrador=${ilus[0]}\n`;
        } else {
            infobox += `  |ilustradores=<br>${ilus.join('<br>')}<br>\n`;
        }
    }

    const grupo = document.getElementById('grupo').value;
    if (grupo) infobox += `  |grupo=${grupo}\n`;

    const codigo = document.getElementById('codigo').value;
    if (codigo) infobox += `  |código=${codigo}\n`;

    const status = document.getElementById('status').value;
    if (status) infobox += `  |status=${status}\n`;

    const website = document.getElementById('website').value;
    if (website) infobox += `  |website=${website}\n`;

    if (tema) infobox += `  |theme=${tema}\n`;

    if (ilustradores && ilustradores.split(',').length > 1) {
        infobox += `|ilustrador=diversos`;
    }

    infobox += '}}';

    return infobox;
}

function gerarConceito() {
    let conceito = '';

    const detalhes = document.getElementById('detalhesPersonagem').value.trim();
    const etimologia = document.getElementById('etimologia').value.trim();
    const descFisica = document.getElementById('descricaoFisica').value.trim();
    const vestimentas = document.getElementById('vestimentas').value.trim();
    const acessorios = document.getElementById('acessorios').value.trim();
    const relacoes = document.getElementById('relacoes').value.trim();

    if (detalhes || etimologia || descFisica || vestimentas || acessorios || relacoes) {
        conceito += '\n\n\n==Conceito==';

        if (detalhes) {
            conceito += `\n\n===<u>Detalhes do personagem</u>===\n${detalhes}`;
        }

        if (etimologia) {
            conceito += `\n\n===<u>Etimologia</u>===\n${etimologia}`;
        }

        if (descFisica || vestimentas || acessorios) {
            conceito += '\n\n===<u>Aparência</u>===';
            if (descFisica) conceito += `\n*'''Descrição física:''' ${descFisica}`;
            if (vestimentas) conceito += `\n*'''Vestimentas:''' ${vestimentas}`;
            if (acessorios) conceito += `\n*'''Acessórios:''' ${acessorios}`;
        }

        if (relacoes) {
            conceito += `\n\n===<u>Relações</u>===\n${relacoes}`;
        }
    }

    return conceito;
}

function gerarInformacoesProduto(temaGlobal) {
    let produto = '\n\n\n==Informações do Produto==';

    const descProduto = document.getElementById('descricaoProduto').value.trim();
    if (descProduto) {
        produto += `\n${descProduto}`;
    }

    const bancos = document.querySelectorAll('.banco-card');
    if (bancos.length === 0) {
        produto += '\n\n===<u>Bancos de voz</u>===\n<tabber>\n</tabber>';
        return produto;
    }

    const bancosPorPlataforma = {};

    bancos.forEach(banco => {
        const plataforma = banco.querySelector('.banco-plataforma').value;
        const categoria = banco.querySelector('.banco-categoria').value;

        if (!bancosPorPlataforma[plataforma]) {
            bancosPorPlataforma[plataforma] = {
                padrao: [],
                adicional: []
            };
        }

        bancosPorPlataforma[plataforma][categoria].push(banco);
    });

    produto += '\n\n===<u>Bancos de voz</u>===';

    for (const plataforma in bancosPorPlataforma) {
        const categorias = bancosPorPlataforma[plataforma];

        if (Object.keys(bancosPorPlataforma).length > 1) {
            produto += `\n====${plataforma}====`;
        }

        if (categorias.padrao.length > 0) {
            produto += '\n====Bancos de voz padrões====\n<tabber>';
            categorias.padrao.forEach(banco => {
                produto += gerarBancoVoz(banco, temaGlobal);
            });
            produto += '\n</tabber>';
        }

        if (categorias.adicional.length > 0) {
            produto += '\n\n====Bancos de voz adicionais====\n<tabber>';
            categorias.adicional.forEach(banco => {
                produto += gerarBancoVoz(banco, temaGlobal);
            });
            produto += '\n</tabber>';
        }
    }

    return produto;
}

function gerarBancoVoz(banco, temaGlobal) {
    const nome = banco.querySelector('.banco-nome').value || 'Sem nome';
    const cor = banco.querySelector('.banco-cor').value || temaGlobal;
    const genero = banco.querySelector('.banco-genero').value;
    const tempo = banco.querySelector('.banco-tempo').value;
    const range = banco.querySelector('.banco-range').value;
    const detalhes = banco.querySelector('.banco-detalhes').value;
    const fonetica = banco.querySelector('.banco-fonetica').value;
    const issues = banco.querySelector('.banco-issues').value;
    const sample = banco.querySelector('.banco-sample').value;

    let vb = `\n|-|${nome}=\n{{Product Information`;

    if (genero) vb += `\n  |Genre=${genero}`;
    if (tempo) vb += `\n  |Tempo=${tempo}`;
    if (range) vb += `\n  |Range=${range}`;
    if (detalhes) vb += `\n  |Details=${detalhes}`;
    if (fonetica) vb += `\n  |Phonetic=${fonetica}`;
    if (issues) vb += `\n  |Issues=${issues}`;
    if (sample) vb += `\n  |Sample=[[File:${sample}]]`;
    if (cor) vb += `\n  |color=${cor}`;

    vb += '\n}}';

    return vb;
}

function gerarTermosUso() {
    let termos = '\n\n===<u>Termos de Uso</u>===';

    const r18 = document.getElementById('r18').value;
    const comercialVB = document.getElementById('comercialVB').value;
    const comercialPersonagem = document.getElementById('comercialPersonagem').value;
    const derivados = document.getElementById('derivados').value;
    const adicionais = document.getElementById('termosAdicionais').value.trim();

    termos += `\n*'''Conteúdo R-18 permitido?''' ${r18 || 'Informação desconhecida'};`;
    termos += `\n*'''Uso comercial do banco de voz permitido?''' ${comercialVB || 'Informação desconhecida'};`;
    termos += `\n*'''Uso comercial do personagem permitido?''' ${comercialPersonagem || 'Informação desconhecida'};`;
    termos += `\n*'''Esses termos aplicam-se a personagens/vozes derivados?''' ${derivados || 'Informação desconhecida'};`;
    termos += `\n*'''Termos adicionais?''' ${adicionais || 'Não aplicáveis até o momento'}.`;

    return termos;
}

function gerarExemplosUso(temaGlobal) {
    const exemplos = document.querySelectorAll('.exemplo-card');
    if (examples.length === 0) return '';

    let usos = '\n\n\n==Exemplos de uso==';

    exemplos.forEach(ex => {
        const imagem = ex.querySelector('.exemplo-imagem').value;
        const titulo = ex.querySelector('.exemplo-titulo').value;
        const tituloOrig = ex.querySelector('.exemplo-titulo-orig').value;
        const cantor = ex.querySelector('.exemplo-cantor').value;
        const produtor = ex.querySelector('.exemplo-produtor').value;
        const descricao = ex.querySelector('.exemplo-descricao').value;
        const yt = ex.querySelector('.exemplo-yt').value;
        const nn = ex.querySelector('.exemplo-nn').value;
        const sc = ex.querySelector('.exemplo-sc').value;
        const cor = ex.querySelector('.exemplo-cor').value || temaGlobal;

        usos += '\n{{Music Info';

        if (imagem) usos += `\n  |image=${imagem}`;

        if (tituloOrig) {
            usos += `\n  |title=<small>${titulo}<br>(${tituloOrig})</small>`;
        } else if (titulo) {
            usos += `\n  |title=<small>${titulo}</small>`;
        }

        if (cantor) usos += `\n  |singer=${cantor}`;
        if (produtor) usos += `\n  |producer=${produtor}`;
        if (descricao) usos += `\n  |description=${descricao}`;

        let links = [];
        if (yt) links.push(`{{external|yt-ico|${yt}|Oficial}}`);
        if (nn) links.push(`{{external|nn-ico|${nn}|Oficial}}`);
        if (sc) links.push(`{{external|sc-ico|${sc}|Oficial}}`);

        if (links.length > 0) {
            usos += `\n  |links=${links.join(' ')}`;
        }

        if (cor) usos += `\n  |color=${cor}`;

        usos += '\n}}';
    });

    usos += '\n\n{{clr}}';

    return usos;
}

function gerarDownloads() {
    let downloads = '\n\n\n==Downloads==';

    const items = document.querySelectorAll('#downloadsContainer .download-item');
    if (items.length > 0) {
        downloads += '\n===<u>Bancos de voz</u>===';

        items.forEach(item => {
            const nome = item.querySelector('.download-nome').value;
            const url = item.querySelector('.download-url').value;
            const hostSelect = item.querySelector('.download-host');
            const hostOutro = item.querySelector('.download-host-outro').value;

            let host = hostSelect.value === '__outro__' ? hostOutro : hostSelect.value;

            if (nome && url) {
                downloads += `\n*'''${nome}:''' [${url} ${host}]`;
            }
        });
    }

    const nota = document.getElementById('downloadNota').value.trim();
    if (nota) {
        downloads += `\n\n${nota}`;
    }

    return downloads;
}

function gerarCuriosidades() {
    const items = document.querySelectorAll('#curiosidadesContainer .curiosidade-item');
    if (items.length === 0) return '';

    let curiosidades = '\n\n\n==Curiosidades==';

    items.forEach(item => {
        const texto = item.querySelector('.curiosidade-texto').value.trim();
        if (texto) {
            curiosidades += `\n*${texto}`;
        }
    });

    return curiosidades;
}

function gerarGaleria() {
    let galeria = '';

    const oficial = document.querySelectorAll('#galeriaOficialContainer .galeria-item');
    const covers = document.querySelectorAll('#galeriaCoversContainer .galeria-item');
    const refs = document.querySelectorAll('#galeriaRefsContainer .galeria-item');
    const extras = document.querySelectorAll('#galeriaExtrasContainer .galeria-item');

    if (oficial.length === 0 && covers.length === 0 && refs.length === 0 && extras.length === 0) {
        return '';
    }

    galeria = '\n\n\n==Galeria==';

    if (oficial.length > 0) {
        galeria += '\n===<u>Artes oficiais</u>===\n<gallery position="center">';
        oficial.forEach(item => {
            galeria += gerarGaleriaItem(item);
        });
        galeria += '\n</gallery>';
    }

    if (covers.length > 0) {
        galeria += '\n===<u>Capas de covers e/ou originais</u>===\n<gallery position="center">';
        covers.forEach(item => {
            galeria += gerarGaleriaItem(item);
        });
        galeria += '\n</gallery>';
    }

    if (refs.length > 0) {
        galeria += '\n===<u>Reference sheets e logotipos</u>===\n<gallery position="center">';
        refs.forEach(item => {
            galeria += gerarGaleriaItem(item);
        });
        galeria += '\n</gallery>';
    }

    if (extras.length > 0) {
        galeria += '\n===<u>Artes extras</u>===\n<gallery position="center">';
        extras.forEach(item => {
            galeria += gerarGaleriaItem(item);
        });
        galeria += '\n</gallery>';
    }

    return galeria;
}

function gerarGaleriaItem(item) {
    const arquivo = item.querySelector('.galeria-arquivo').value.trim();
    const descricao = item.querySelector('.galeria-descricao').value.trim();
    const artista = item.querySelector('.galeria-artista').value.trim();

    if (!arquivo) return '';

    let linha = `\n${arquivo}`;
    if (descricao || artista) {
        linha += '|<center>';
        if (descricao) linha += descricao;
        if (artista) linha += `<br>Arte feita por ${artista}`;
        linha += '</center>';
    }

    return linha;
}

function gerarLinksExternos() {
    const items = document.querySelectorAll('#linksExternosContainer .link-item');
    if (items.length === 0) return '';

    let links = '\n\n\n==Links externos==';

    items.forEach(item => {
        const nome = item.querySelector('.link-nome').value.trim();
        const url = item.querySelector('.link-url').value.trim();

        if (nome && url) {
            links += `\n*[${url} ${nome}]`;
        }
    });

    return links;
}

function gerarCategorias() {
    let categorias = '\n\n\n';

    const checkboxes = document.querySelectorAll('.categorias-grid input[type="checkbox"]:checked');
    checkboxes.forEach(cb => {
        categorias += `[[Categoria:${cb.value}]]\n`;
    });

    const criadorCat = document.getElementById('categoriaCriador').value.trim();
    if (criadorCat) {
        categorias += `[[Categoria:${criadorCat}]]\n`;
    }

    return categorias;
}

function copiarCodigo() {
    const codigo = document.getElementById('codigoOutput').value;

    if (!codigo || codigo.includes('Preencha os campos')) {
        showToast('Gere o código primeiro!', 'error');
        return;
    }

    navigator.clipboard.writeText(codigo).then(() => {
        playSave();
        showToast('Código copiado!');
    }).catch(() => {
        showToast('Erro ao copiar', 'error');
    });
}

function limparTudo() {
    if (!confirm('Tem certeza que deseja limpar todos os campos?')) return;

    document.querySelectorAll('input[type="text"], textarea').forEach(el => {
        el.value = '';
    });

    document.querySelectorAll('select').forEach(el => {
        el.selectedIndex = 0;
    });

    document.querySelectorAll('input[type="checkbox"]').forEach(el => {
        el.checked = false;
    });

    document.getElementById('bancosContainer').innerHTML = '';
    document.getElementById('exemplosContainer').innerHTML = '';
    document.getElementById('galeriaOficialContainer').innerHTML = '';
    document.getElementById('galeriaCoversContainer').innerHTML = '';
    document.getElementById('galeriaRefsContainer').innerHTML = '';
    document.getElementById('galeriaExtrasContainer').innerHTML = '';
    document.getElementById('downloadsContainer').innerHTML = '';
    document.getElementById('curiosidadesContainer').innerHTML = '';
    document.getElementById('linksExternosContainer').innerHTML = '';

    bancoCounter = 0;
    exemploCounter = 0;

    document.getElementById('codigoOutput').value = '';

    showToast('Campos limpos!');
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('nome').focus();
});
