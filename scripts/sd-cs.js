const PF = "sd-cs";

const removeGhostLinks = () => {
    const containers = document.querySelectorAll(`div[class*="${PF}-display-"]`);
    containers.forEach(div => {
        let next = div.nextSibling;
        while (next) {
            let toDelete = next;
            next = next.nextSibling;
            if (toDelete.nodeType === 3 || toDelete.tagName === 'A' || toDelete.tagName === 'BR') {
                toDelete.remove();
            } else {
                break; 
            }
        }
    });
};

const openDocument = async (uuid) => {
    const doc = await fromUuid(uuid);
    if (doc) doc.sheet.render(true);
};

// Global händelselyssnare för att fånga klick på knappar som skapats dynamiskt
document.addEventListener('click', async (ev) => {
    const rollBtn = ev.target.closest(`.${PF}-roll-table-btn`);
    if (rollBtn) {
        ev.preventDefault();
        ev.stopPropagation();
        const table = await fromUuid(rollBtn.dataset.uuid);
        if (table) {
            await table.draw();
        }
        return;
    }

    const headerLink = ev.target.closest('.header-link');
    if (headerLink) {
        ev.preventDefault();
        ev.stopPropagation();
        openDocument(headerLink.dataset.uuid);
    }
});

// Isolerad lyssnare för DisplayRequest
document.addEventListener('click', (ev) => {
    const reqBtn = ev.target.closest(`.${PF}-request-link`);
    if (reqBtn) {
        ev.preventDefault();
        ev.stopPropagation();
        const { ability, dc } = reqBtn.dataset;
        if (game.shadowdark?.RequestCheckSD?.displayRequest) {
            game.shadowdark.RequestCheckSD.displayRequest(ability, dc);
        }
    }
});

// Isolerad lyssnare för DisplayRequest
document.addEventListener('click', (ev) => {
    const reqBtn = ev.target.closest(`.${PF}-request-link`);
    if (reqBtn) {
        ev.preventDefault();
        ev.stopPropagation();
        const { ability, dc } = reqBtn.dataset;
        if (game.shadowdark?.RequestCheckSD?.displayRequest) {
            game.shadowdark.RequestCheckSD.displayRequest(ability, dc);
        }
    }
});

Hooks.once('init', () => {
    const observer = new MutationObserver(() => removeGhostLinks());
    observer.observe(document.body, { childList: true, subtree: true });

    CONFIG.TextEditor.enrichers.push(
        {
            pattern: /@DisplayItemCard\[(.*?)\]/g,
            enricher: async (match) => {
                const item = await fromUuid(match[1]);
                if (!item) return document.createElement("span");
                const div = document.createElement("div");
                div.classList.add(`${PF}-display-item-container`);
                div.innerHTML = `
                    <div class="${PF}-card">
                        <div class="${PF}-card-header">
                            <a class="header-link" data-uuid="${item.uuid}">
                                ${item.name}
                            </a>
                            <span style="font-size:0.8em">${(item.type || "").toUpperCase()}</span>
                        </div>
                        <div class="${PF}-card-body">${item.system?.description || ""}</div>
                    </div>`;
                return div;
            }
        },
        {
            pattern: /@DisplayNpcCardDetailed\[(.*?)\]/g,
            enricher: async (match) => {
                const npc = await fromUuid(match[1]);
                if (!npc) return document.createElement("span");

                const hp = npc.system.attributes?.hp?.max ?? 0;
                const ac = npc.system.attributes?.ac?.value ?? 10;
                const lv = npc.system.level?.value ?? 0;
                
                const mvBase = npc.system.move || "";
                const mvNote = npc.system.moveNote || "";
                const mvDisplay = mvNote ? `${mvBase} (${mvNote})` : mvBase;
                const alignment = npc.system.alignment || "";
                const description = npc.system.notes || "";
                const abl = npc.system.abilities || {};
                
                const statsHtml = `
                    <div class="${PF}-npc-master-stats">
                        <div class="stat-box"><b>STR</b><br>${abl.str?.mod >= 0 ? "+" : ""}${abl.str?.mod || 0}</div>
                        <div class="stat-box"><b>DEX</b><br>${abl.dex?.mod >= 0 ? "+" : ""}${abl.dex?.mod || 0}</div>
                        <div class="stat-box"><b>CON</b><br>${abl.con?.mod >= 0 ? "+" : ""}${abl.con?.mod || 0}</div>
                        <div class="stat-box"><b>INT</b><br>${abl.int?.mod >= 0 ? "+" : ""}${abl.int?.mod || 0}</div>
                        <div class="stat-box"><b>WIS</b><br>${abl.wis?.mod >= 0 ? "+" : ""}${abl.wis?.mod || 0}</div>
                        <div class="stat-box"><b>CHA</b><br>${abl.cha?.mod >= 0 ? "+" : ""}${abl.cha?.mod || 0}</div>
                        <div class="stat-divider"></div>
                        <div class="stat-box"><b>AC</b><br>${ac}</div>
                        <div class="stat-box"><b>HP</b><br>${hp}</div>
                    </div>
                    <div class="${PF}-npc-sub-stats-row">
                        <span><b>Movement (MV):</b> ${mvDisplay}</span>
                        <span><b>Alignment:</b> ${alignment}</span>
                    </div>`;

                let sections = { attacks: "", specials: "", features: "", spells: "" };
                for (let i of npc.items) {
                    const rawDesc = (await TextEditor.enrichHTML(i.system.description || "", {async: true}));
                    const enrichedDesc = rawDesc.replace(/<\/?p>/g, "").trim();

                    if (i.type === "NPC Attack") {
                        const range = i.system.ranges?.length > 0 ? `[${i.system.ranges[0]}] ` : "";
                        const bonus = i.system.bonuses?.attackBonus ?? 0;
                        const atkBonus = bonus >= 0 ? `+${bonus}` : bonus;
                        const dmgVal = i.system.damage?.value || "";
                        const specVal = i.system.damage?.special || "";
                        // Kombinerar skada och special i formatet (skada + special) om båda finns
                        const damageAndSpecial = specVal ? `(${dmgVal} + ${specVal})` : `(${dmgVal})`;

                        const properties = enrichedDesc ? ` ${enrichedDesc}` : "";
                        sections.attacks += `<div class="entry"><b>${i.name}:</b> ${range}${atkBonus} ${damageAndSpecial}${properties}</div>`;
                    } 
                    else if (i.type === "NPC Special Attack") {
                        const bonus = i.system.bonuses?.attackBonus ?? 0;
                        const atkBonus = bonus >= 0 ? `+${bonus}` : bonus;
                        const content = enrichedDesc ? ` ${enrichedDesc}` : ` +${atkBonus}`;
                        sections.specials += `<div class="entry"><b>${i.name}:</b>${content}</div>`;
                    } 
                    else if (i.type === "NPC Feature") {
                        const targetKey = i.name.toLowerCase().includes("spell") ? "spells" : "features";
                        sections[targetKey] += `<div class="entry"><b>${i.name}:</b> ${enrichedDesc}</div>`;
                    }
                }

                let listHtml = "";
                if (sections.attacks) listHtml += `<div class="section-label">ATTACKS</div>${sections.attacks}`;
                if (sections.specials) listHtml += `<div class="section-label">SPECIAL ATTACKS</div>${sections.specials}`;
                if (sections.features) listHtml += `<div class="section-label">FEATURES</div>${sections.features}`;
                if (sections.spells) listHtml += `<div class="section-label">SPELLS</div>${sections.spells}`;

                const div = document.createElement("div");
                div.classList.add(`${PF}-display-npc-container`);
                div.innerHTML = `
                    <div class="${PF}-card">
                        <div class="${PF}-card-header">
                            <a class="header-link" data-uuid="${npc.uuid}">
                                <i class="fas fa-user"></i> ${npc.name}
                            </a>
                            <span>LEVEL ${lv}</span>
                        </div>
                        ${description ? `<div class="${PF}-npc-description"><i>${description}</i></div>` : ""}
                        ${statsHtml}
                        <div class="${PF}-card-body">${listHtml}</div>
                    </div>`;
                return div;
            }
        },
        {
            pattern: /@DisplayTable\[(.*?)\]/g,
            enricher: async (match) => {
                const table = await fromUuid(match[1]);
                if (!table) return document.createElement("span");
                let rows = "";
                for (let r of table.results) {
                    const range = r.range[0] === r.range[1] ? r.range[0] : `${r.range[0]}-${r.range[1]}`;
                    const text = await TextEditor.enrichHTML(r.text || "", {async: true});
                    rows += `<tr><td class="rng">${range}</td><td>${text}</td></tr>`;
                }
                const div = document.createElement("div");
                div.classList.add(`${PF}-display-table-container`);
                div.innerHTML = `
                    <table class="${PF}-table">
                        <thead>
                            <tr>
                                <th colspan="2">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <a class="header-link" data-uuid="${table.uuid}">
                                            ${table.name}
                                        </a>
                                        <button type="button" class="${PF}-roll-table-btn" data-uuid="${table.uuid}">
                                            <i class="fas fa-dice-d20"></i> ROLL
                                        </button>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>`;
                return div;
            }
        }, // <--- Kommatecknet här är kritiskt för att listan ska fortsätta
        {
            pattern: /@DisplayRequest\[(\d+)\s+(STR|DEX|CON|INT|WIS|CHA)\]/g,
            enricher: async (match) => {
                const dc = match[1];
                const ability = match[2];
                const a = document.createElement("a");
                a.classList.add(`${PF}-request-link`);
                a.dataset.ability = ability;
                a.dataset.dc = dc;
                a.innerHTML = `<i class="fas fa-dice-d20"></i> DC ${dc} ${ability} Check`;
                a.style.cursor = "pointer";
                a.style.fontWeight = "bold";
                return a;
            }
        }
    ); // <--- Nu stängs .push() här istället
});