// --- Funkce pro odebrání skupiny ---
function addRemoveHandler(btn) {
    btn.addEventListener("click", function() {
        btn.parentElement.remove();
    });
}

// --- Přidání nové pracovní skupiny ---
document.getElementById("addGroup").addEventListener("click", function() {
    let container = document.getElementById("workerGroups");

    let newGroup = document.createElement("div");
    newGroup.classList.add("worker-group");
    newGroup.innerHTML = `
        <input type="number" name="workers[]" min="1" placeholder="Počet pracovníků" required>
        <input type="time" name="timeFrom[]" value="00:00" required>
        <input type="time" name="timeTo[]" value="00:00" required>
        <button type="button" class="remove-btn">❌ Odebrat</button>
    `;
    container.appendChild(newGroup);

    addRemoveHandler(newGroup.querySelector(".remove-btn"));
});

// --- Pomocná funkce pro převod času na minuty ---
function parseTimeToMinutes(timeStr) {
    let [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
}

// --- Načtení uložených hodnot při startu stránky ---
window.addEventListener("DOMContentLoaded", () => {
    ["coef1", "coef2", "coef3", "expected"].forEach(id => {
        if(localStorage.getItem(id)) document.getElementById(id).value = localStorage.getItem(id);
    });

    let savedGroups = JSON.parse(localStorage.getItem("workerGroups") || "[]");
    let container = document.getElementById("workerGroups");
    container.innerHTML = "";

    if(savedGroups.length > 0){
        savedGroups.forEach(g => {
            let newGroup = document.createElement("div");
            newGroup.classList.add("worker-group");
            newGroup.innerHTML = `
                <input type="number" name="workers[]" min="1" placeholder="Počet pracovníků" value="${g.workers}" required>
                <input type="time" name="timeFrom[]" value="${g.from}" required>
                <input type="time" name="timeTo[]" value="${g.to}" required>
                <button type="button" class="remove-btn">❌ Odebrat</button>
            `;
            container.appendChild(newGroup);
            addRemoveHandler(newGroup.querySelector(".remove-btn"));
        });
    } else {
        document.getElementById("addGroup").click();
    }
});

// --- Odeslání formuláře a výpočet ---
document.getElementById("coefForm").addEventListener("submit", function(event){
    event.preventDefault();

    let c1 = parseFloat(document.getElementById("coef1").value);
    let c2 = parseFloat(document.getElementById("coef2").value);
    let c3 = parseFloat(document.getElementById("coef3").value);
    let expected = parseFloat(document.getElementById("expected").value);

    let workers = document.getElementsByName("workers[]");
    let timesFrom = document.getElementsByName("timeFrom[]");
    let timesTo = document.getElementsByName("timeTo[]");

    // --- Celkové odpracované hodiny ---
    let totalHours = 0;
    for(let i=0;i<workers.length;i++){
        let w = parseInt(workers[i].value);
        let fromM = parseTimeToMinutes(timesFrom[i].value);
        let toM = parseTimeToMinutes(timesTo[i].value);
        let diffM = toM - fromM;
        if(diffM < 0) diffM += 24*60;
        totalHours += (diffM / 60) * w;
    }

    // --- Hodiny podle koeficientů ---
    let hodiny = [(1/c1)*expected, (1/c2)*expected, (1/c3)*expected];
    let minHodiny = Math.min(...hodiny);
    let celkPracovniku = Array.from(workers).reduce((sum,w)=>sum+parseInt(w.value),0);

    let erko, rozdilText = "";

    if(hodiny.every(h=>h > totalHours)){
        erko = "Erko vychází ✅";
        let rozdil = minHodiny - totalHours;
        let hodinyNaPracovnika = rozdil / celkPracovniku;
        rozdilText = `<p>Každý pracovník může přidat maximálně ${hodinyNaPracovnika.toFixed(2)} h, aniž by Erko přestalo vycházet.</p>`;
    } else {
        erko = "Erko nevychází ❌";
        let rozdil = Math.abs(minHodiny - totalHours);
        let hodinyNaPracovnika = rozdil / celkPracovniku;

        // Očekávaný stav, aby Erko vyšlo
        let koefMinIndex = hodiny.indexOf(minHodiny);
        let koefMin = [c1,c2,c3][koefMinIndex];
        let expectedNew = totalHours * koefMin;

        rozdilText = `
            <p>Rozdíl: ${rozdil.toFixed(2)} h</p>
            <p>Každý pracovník by musel pracovat o ${hodinyNaPracovnika.toFixed(2)} h méně/ více.</p>
            <p>Očekávaný stav by musel být ${expectedNew.toFixed(2)}, aby Erko vyšlo ✅</p>
        `;

        // --- Hodiny pro všechny koeficienty ---
        let hodinyText = `<p><strong>Potřebné hodiny pro koeficienty:</strong><br>
            Hodiny 1: ${hodiny[0].toFixed(2)} h<br>
            Hodiny 2: ${hodiny[1].toFixed(2)} h<br>
            Hodiny 3: ${hodiny[2].toFixed(2)} h
        </p>`;

        // --- Kompromisy ---
        let kompromisyArr = [];
        let krok = (expectedNew - expected)/4;
        for(let i=1;i<=3;i++){
            let expectedVariant = expected + krok*i;
            let hodinyVariant3 = (1/c3)*expectedVariant;
            kompromisyArr.push(`<tr>
                <td>${i}</td>
                <td>${expectedVariant.toFixed(2)}</td>
                <td>${hodinyVariant3.toFixed(2)}</td>
            </tr>`);
        }

        rozdilText += hodinyText + `
            <h3>Kompromisy</h3>
            <table class="predikce-table">
                <thead>
                    <tr>
                        <th>Varianta</th>
                        <th>Očekávaný stav</th>
                        <th>Hodiny</th>
                    </tr>
                </thead>
                <tbody>
                    ${kompromisyArr.join("")}
                </tbody>
            </table>
        `;
    }

    // --- Uložení do localStorage ---
    ["coef1","coef2","coef3","expected"].forEach(id=>localStorage.setItem(id, document.getElementById(id).value));
    let groupsToSave = Array.from(workers).map((w,i)=>({workers:w.value,from:timesFrom[i].value,to:timesTo[i].value}));
    localStorage.setItem("workerGroups", JSON.stringify(groupsToSave));

    // --- Výstup ---
    document.getElementById("result").innerHTML = `<p><strong>${erko}</strong></p>${rozdilText}`;
});
