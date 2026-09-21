// --- 0. سكريبتات الحماية العامة ---
document.addEventListener('contextmenu', function(e) { 
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault(); 
    }
});

document.onkeydown = function(e) {
    if(e.keyCode == 123) return false; 
    if(e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 74 || e.keyCode == 67)) return false; 
    if(e.ctrlKey && e.keyCode == 85) return false; 
};

// --- 1. التبديل بين التبويبات (إدارة ظهور الكاميرا والتخصيص) ---
const tabBtns = document.querySelectorAll(".tab-btn");
const sections = document.querySelectorAll(".input-section");
const customizationBox = document.getElementById("main_customization_box");
const actionButtons = document.getElementById("main_action_buttons");
const resultBox = document.getElementById("resultBox");
let currentActiveType = "section_text";

tabBtns.forEach(btn => {
    btn.addEventListener("click", function() {
        tabBtns.forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        
        sections.forEach(sec => sec.classList.remove("active"));
        const targetId = this.getAttribute("data-target");
        document.getElementById(targetId).classList.add("active");
        currentActiveType = targetId;

        if(targetId === "section_scan") {
            customizationBox.style.display = "none";
            actionButtons.style.display = "none";
            resultBox.style.display = "none";
        } else {
            customizationBox.style.display = "block";
            actionButtons.style.display = "flex";
            if(typeof stopQrScanner === "function") stopQrScanner();
        }
    });
});

// --- 2. محرك القارئ (Scanner Engine) وصوت البيب وسجل المسح ---
let html5QrCode;
const btnStartScan = document.getElementById("btn_start_scan");
const btnStopScan = document.getElementById("btn_stop_scan");
const scanResultBox = document.getElementById("scan_result_box");
const scanResultText = document.getElementById("scan_result_text");
const btnOpenScanLink = document.getElementById("btn_open_scan_link");

function playBeepSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.connect(audioCtx.destination);
        oscillator.start();
        setTimeout(() => oscillator.stop(), 150);
    } catch(e) {}
}

function stopQrScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            btnStartScan.style.display = "block";
            btnStopScan.style.display = "none";
        }).catch(err => console.log("تجاهل خطأ التوقف المزدوج"));
    }
}

// تخزين وعرض السجل الممسوح
function saveScanHistory(decodedText) {
    let history = JSON.parse(localStorage.getItem("qr_scan_history_pro") || "[]");
    history = history.filter(item => item !== decodedText); // منع التكرار
    history.unshift(decodedText);
    if(history.length > 10) history.pop(); // الاحتفاظ بآخر 10 عمليات مسح
    localStorage.setItem("qr_scan_history_pro", JSON.stringify(history));
    loadScanHistory();
}

function loadScanHistory() {
    let history = JSON.parse(localStorage.getItem("qr_scan_history_pro") || "[]");
    const scanHistorySec = document.getElementById("scanHistorySection");
    const scanHistoryList = document.getElementById("scanHistoryList");
    if (!scanHistorySec || !scanHistoryList) return;

    scanHistoryList.innerHTML = "";
    
    if(history.length > 0) {
        scanHistorySec.style.display = "block";
        history.forEach(text => {
            let itemDiv = document.createElement("div");
            itemDiv.className = "scan-history-item";
            
            let textDiv = document.createElement("div");
            textDiv.className = "scan-history-text";
            textDiv.innerText = text;
            
            let actionsDiv = document.createElement("div");
            actionsDiv.className = "scan-history-actions";
            
            let copyBtn = document.createElement("button");
            copyBtn.className = "scan-action-btn";
            copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i>';
            copyBtn.title = "نسخ";
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(text);
                alert("تم النسخ!");
            };
            actionsDiv.appendChild(copyBtn);

            if (text.startsWith("http://") || text.startsWith("https://")) {
                let openBtn = document.createElement("button");
                openBtn.className = "scan-action-btn";
                openBtn.innerHTML = '<i class="fa-solid fa-external-link"></i>';
                openBtn.title = "فتح الرابط";
                openBtn.onclick = () => window.open(text, "_blank");
                actionsDiv.appendChild(openBtn);
            }
            
            itemDiv.appendChild(textDiv);
            itemDiv.appendChild(actionsDiv);
            scanHistoryList.appendChild(itemDiv);
        });
    } else {
        scanHistorySec.style.display = "none";
    }
}

btnStartScan.addEventListener("click", () => {
    scanResultBox.style.display = "none";
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }
    
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText, decodedResult) => {
            playBeepSound();
            stopQrScanner();
            scanResultBox.style.display = "block";
            scanResultText.value = decodedText;
            
            // حفظ النتيجة في السجل
            saveScanHistory(decodedText);
            
            if (decodedText.startsWith("http://") || decodedText.startsWith("https://")) {
                btnOpenScanLink.style.display = "block";
                btnOpenScanLink.onclick = () => window.open(decodedText, "_blank");
            } else {
                btnOpenScanLink.style.display = "none";
            }
        },
        (errorMessage) => {}
    ).then(() => {
        btnStartScan.style.display = "none";
        btnStopScan.style.display = "block";
    }).catch((err) => {
        alert("لم نتمكن من الوصول للكاميرا. يرجى التأكد من إعطاء الصلاحيات للمتصفح.");
    });
});

btnStopScan.addEventListener("click", stopQrScanner);

document.getElementById("btn_copy_scan").addEventListener("click", () => {
    scanResultText.select();
    document.execCommand("copy");
    alert("تم نسخ النص للحافظة بنجاح!");
});

// --- 3. عداد الأحرف والنصيحة الديناميكية ---
const qrInput = document.getElementById("input_qr_text");
const charCountDisplay = document.getElementById("char_count");
const charAdviceDisplay = document.getElementById("char_advice");
const ecSelect = document.getElementById("qr_ec_level");

qrInput.addEventListener("input", function() {
    const length = this.value.length;
    charCountDisplay.innerText = `عدد الأحرف: ${length}`;
    
    if (length === 0) {
        charAdviceDisplay.innerText = "ابدأ الكتابة للحصول على نصيحة الأداء واختيار الدقة...";
        charAdviceDisplay.style.color = "inherit";
    } else if (length <= 100) {
        charAdviceDisplay.innerHTML = "🟢 سرعة مسح فائقة. <b>ينصح بـ: أقصى (H)</b>";
        charAdviceDisplay.style.color = "var(--success-text)";
        ecSelect.value = "H";
    } else if (length <= 300) {
        charAdviceDisplay.innerHTML = "🟡 سرعة مسح جيدة جداً. <b>ينصح بـ: متوسط (M)</b>";
        charAdviceDisplay.style.color = "#8e8e00"; 
        ecSelect.value = "M";
    } else if (length <= 600) {
        charAdviceDisplay.innerHTML = "🟠 الرمز مزدحم. <b>ينصح بـ: منخفض (L)</b>";
        charAdviceDisplay.style.color = "var(--warning-text)";
        ecSelect.value = "L";
    } else {
        charAdviceDisplay.innerHTML = "🔴 تحذير: ثقيل جداً وقد يصعب مسحه. <b>إجباري: منخفض (L)</b>";
        charAdviceDisplay.style.color = "var(--danger-text)";
        ecSelect.value = "L";
    }
});

// --- 4. برمجة زر تفريغ الحقول ---
document.getElementById("btn_clear_fields").addEventListener("click", function() {
    if(confirm("هل أنت متأكد أنك تريد مسح جميع البيانات المدخلة؟")) {
        document.getElementById("input_qr_text").value = "";
        document.getElementById("wifi_ssid").value = "";
        document.getElementById("wifi_password").value = "";
        document.getElementById("vcard_name").value = "";
        document.getElementById("vcard_phone").value = "";
        document.getElementById("vcard_email").value = "";
        document.getElementById("wa_number").value = "";
        document.getElementById("wa_message").value = "";
        
        document.getElementById("email_address").value = "";
        document.getElementById("email_subject").value = "";
        document.getElementById("email_body").value = "";
        document.getElementById("sms_number").value = "";
        document.getElementById("sms_message").value = "";
        document.getElementById("geo_lat").value = "";
        document.getElementById("geo_lng").value = "";
        
        document.getElementById("color_dark").value = "#000000";
        document.getElementById("color_light").value = "#ffffff";
        document.getElementById("color_eye_outer").value = "#000000";
        document.getElementById("color_eye_inner").value = "#000000";
        document.getElementById("qr_dot_scale").value = "1";
        
        document.getElementById("qr_logo_upload").value = "";
        uploadedLogoData = null;
        document.getElementById("logo_size").value = "60";
        document.getElementById("logo_transparent").checked = false;
        document.getElementById("print_description").value = "";
        
        document.getElementById("char_count").innerText = "عدد الأحرف: 0";
        charAdviceDisplay.innerText = "ابدأ الكتابة للحصول على نصيحة الأداء واختيار الدقة...";
        charAdviceDisplay.style.color = "inherit";
        document.getElementById("qr_ec_level").value = "H";
        
        document.getElementById("resultBox").style.display = "none";
    }
});

// --- 5. تبديل الوضع الليلي ---
document.getElementById("btn_toggle_darkmode").addEventListener("click", function() {
    document.body.classList.toggle("dark-mode");
    let icon = this.querySelector("i");
    if(document.body.classList.contains("dark-mode")) {
        icon.classList.remove("fa-moon");
        icon.classList.add("fa-sun");
        icon.style.color = "#f1c40f"; 
    } else {
        icon.classList.remove("fa-sun");
        icon.classList.add("fa-moon");
        icon.style.color = ""; 
    }
});

// --- 6. التحكم بتبويبات الأسئلة الشائعة ---
const accordions = document.querySelectorAll(".accordion-btn");
accordions.forEach(acc => {
    acc.addEventListener("click", function() {
        this.classList.toggle("active");
        const content = this.nextElementSibling;
        if (content.style.maxHeight) { content.style.maxHeight = null; } 
        else { content.style.maxHeight = content.scrollHeight + "px"; }
    });
});

// --- 7. قراءة الشعار المرفوع من المستخدم ---
let uploadedLogoData = null;
document.getElementById('qr_logo_upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = function(event) { uploadedLogoData = event.target.result; }
        reader.readAsDataURL(file);
    } else {
        uploadedLogoData = null;
    }
});

// --- 8. دالة تجميع البيانات وتجهيزها ---
function getQRData() {
    if (currentActiveType === "section_text") {
        return document.getElementById("input_qr_text").value.trim();
    } else if (currentActiveType === "section_wifi") {
        let ssid = document.getElementById("wifi_ssid").value.trim();
        let pass = document.getElementById("wifi_password").value.trim();
        let type = document.getElementById("wifi_type").value;
        if(!ssid) return "";
        return `WIFI:T:${type};S:${ssid};P:${pass};;`;
    } else if (currentActiveType === "section_vcard") {
        let name = document.getElementById("vcard_name").value.trim();
        let phone = document.getElementById("vcard_phone").value.trim();
        let email = document.getElementById("vcard_email").value.trim();
        if(!name || !phone) return "";
        return `BEGIN:VCARD\nVERSION:3.0\nN;CHARSET=UTF-8:${name}\nFN;CHARSET=UTF-8:${name}\nTEL:${phone}\nEMAIL:${email}\nEND:VCARD`;
    } else if (currentActiveType === "section_whatsapp") {
        let rawPhone = document.getElementById("wa_number").value.trim();
        let phone = rawPhone.replace(/\D/g, ''); 
        if (phone.startsWith('00')) { phone = phone.substring(2); }
        let msg = encodeURIComponent(document.getElementById("wa_message").value.trim());
        if(!phone) return "";
        return `https://api.whatsapp.com/send?phone=${phone}&text=${msg}`;
    } else if (currentActiveType === "section_email") {
        let email = document.getElementById("email_address").value.trim();
        let subject = encodeURIComponent(document.getElementById("email_subject").value.trim());
        let body = encodeURIComponent(document.getElementById("email_body").value.trim());
        if(!email) return "";
        return `mailto:${email}?subject=${subject}&body=${body}`;
    } else if (currentActiveType === "section_sms") {
        let phone = document.getElementById("sms_number").value.trim();
        let msg = encodeURIComponent(document.getElementById("sms_message").value.trim());
        if(!phone) return "";
        return `smsto:${phone}:${msg}`;
    } else if (currentActiveType === "section_geo") {
        let lat = document.getElementById("geo_lat").value.trim();
        let lng = document.getElementById("geo_lng").value.trim();
        if(!lat || !lng) return "";
        return `https://maps.google.com/?q=${lat},${lng}`;
    }
    return "";
}

// --- دالة التسمية الذكية للملفات (الجديدة) ---
function getSmartFileName() {
    let prefix = "QR";
    if (currentActiveType === "section_text") {
        prefix = "Text_Link";
    } else if (currentActiveType === "section_wifi") {
        let ssid = document.getElementById("wifi_ssid").value.trim();
        prefix = ssid ? `WiFi_${ssid}` : "WiFi";
    } else if (currentActiveType === "section_vcard") {
        let name = document.getElementById("vcard_name").value.trim();
        prefix = name ? `Contact_${name.replace(/\s+/g, '_')}` : "Contact";
    } else if (currentActiveType === "section_whatsapp") {
        prefix = "WhatsApp";
    } else if (currentActiveType === "section_email") {
        prefix = "Email";
    } else if (currentActiveType === "section_sms") {
        prefix = "SMS";
    } else if (currentActiveType === "section_geo") {
        prefix = "Location";
    }
    
    const date = new Date();
    const dateString = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    return `${prefix}_${dateString}`;
}

// --- 9. المحرك الرئيسي: إنشاء الـ QR Code ---
let qrcodeObject = null;
document.getElementById("btn_generate_qr").addEventListener("click", function() {
    let rawData = getQRData();
    if (!rawData) {
        alert("يرجى تعبئة الحقول المطلوبة بشكل صحيح قبل الإنشاء.");
        return;
    }

    let qrFinalData = rawData;
    if (currentActiveType === "section_text" || currentActiveType === "section_vcard") {
        qrFinalData = '\uFEFF' + rawData;
    }

    const container = document.getElementById("qrcode_container");
    container.innerHTML = "";

    let colorDark = document.getElementById("color_dark").value;
    let colorLight = document.getElementById("color_light").value;
    let eyeOuter = document.getElementById("color_eye_outer").value;
    let eyeInner = document.getElementById("color_eye_inner").value;
    let dotScaleVal = parseFloat(document.getElementById("qr_dot_scale").value);
    let ecLevel = document.getElementById("qr_ec_level").value;

    let options = {
        text: qrFinalData,
        width: 250,
        height: 250,
        colorDark : colorDark,
        colorLight : colorLight,
        PO: eyeOuter,         
        PI: eyeInner,         
        dotScale: dotScaleVal, 
        correctLevel : QRCode.CorrectLevel[ecLevel],
        quietZone: 15,
        quietZoneColor: colorLight
    };

    if(uploadedLogoData) {
        let logoSize = parseInt(document.getElementById("logo_size").value);
        let isTransparent = document.getElementById("logo_transparent").checked;
        
        options.logo = uploadedLogoData;
        options.logoWidth = logoSize;
        options.logoHeight = logoSize;
        options.logoBackgroundColor = colorLight;
        options.logoBackgroundTransparent = isTransparent;
    }

    qrcodeObject = new QRCode(container, options);
    
    let printDescText = document.getElementById("print_description").value.trim();
    let printOutputEl = document.getElementById("print_desc_output");
    if(printDescText !== "") {
        printOutputEl.innerText = printDescText;
        printOutputEl.style.display = "block";
    } else {
        printOutputEl.innerText = "";
        printOutputEl.style.display = "none";
    }

    document.getElementById("resultBox").style.display = "block";
    
    setTimeout(() => {
        document.getElementById("resultBox").scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    
    setTimeout(() => {
        saveToHistory();
        loadHistory();
    }, 500);
});

// --- 10. التحميل بالصيغ المتعددة والتسمية الذكية ---
document.getElementById("btn_download_qr").addEventListener("click", function() {
    const canvas = document.querySelector("#qrcode_container canvas");
    if (!canvas) return alert("يرجى إنشاء الكود أولاً.");

    let format = document.getElementById("select_qr_format").value;
    let smartName = getSmartFileName();

    if(format === "pdf") {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const imgData = canvas.toDataURL("image/png");
        doc.setFont("helvetica");
        doc.text(`QR Code - ${smartName}`, 10, 20);
        doc.addImage(imgData, 'PNG', 50, 40, 110, 110);
        doc.save(`${smartName}.pdf`);
    } else {
        const imageType = `image/${format}`;
        const dataUrl = canvas.toDataURL(imageType);
        const link = document.createElement('a');
        link.download = `${smartName}.${format}`;
        link.href = dataUrl;
        link.click();
    }
});

// --- 11. مشاركة الصورة عبر واتساب بالتسمية الذكية ---
document.getElementById("btn_share_qr_whatsapp").addEventListener("click", async function(e) {
    e.preventDefault();
    const canvas = document.querySelector("#qrcode_container canvas");
    if (!canvas) return alert("يرجى إنشاء الكود أولاً.");

    let smartName = getSmartFileName();

    canvas.toBlob(async function(blob) {
        const file = new File([blob], `${smartName}.png`, { type: "image/png" });
        const shareData = {
            title: 'QR Code',
            text: 'تفضل هذا الـ QR Code الذي قمت بإنشائه:',
            files: [file]
        };

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log("تم إلغاء المشاركة أو حدث خطأ:", err);
            }
        } else {
            alert("متصفحك الحالي لا يدعم المشاركة المباشرة للصور. يرجى تحميل الصورة ومشاركتها يدوياً.");
        }
    }, "image/png");
});

// --- 12. طباعة الصورة مباشرة ---
document.getElementById("btn_print_qr").addEventListener("click", function() {
    window.print();
});

// --- 13. حفظ واسترجاع السجل المحلي للمولد ---
function saveToHistory() {
    const canvas = document.querySelector("#qrcode_container canvas");
    if(!canvas) return;
    const imgData = canvas.toDataURL("image/jpeg", 0.5); 
    let history = JSON.parse(localStorage.getItem("qr_history_pro") || "[]");
    history.unshift(imgData); 
    if(history.length > 5) history.pop(); 
    localStorage.setItem("qr_history_pro", JSON.stringify(history));
}

function loadHistory() {
    let history = JSON.parse(localStorage.getItem("qr_history_pro") || "[]");
    const historySec = document.getElementById("historySection");
    const historyGrid = document.getElementById("historyGrid");
    historyGrid.innerHTML = "";
    
    if(history.length > 0) {
        historySec.style.display = "block";
        history.forEach(imgData => {
            let img = document.createElement("img");
            img.src = imgData;
            let div = document.createElement("div");
            div.className = "history-item";
            div.appendChild(img);
            
            div.addEventListener("click", () => {
                const link = document.createElement('a');
                link.download = "Saved_QR_Code.png";
                link.href = imgData;
                link.click();
            });
            historyGrid.appendChild(div);
        });
    }
}

// تحميل السجلات عند فتح التطبيق
window.onload = () => {
    loadHistory();
    loadScanHistory();
};

// --- 14. مشاركة رابط التطبيق العام ---
document.getElementById("btn_share_app").addEventListener("click", async () => {
    const shareData = {
        title: 'المولد الاحترافي QR Code Pro',
        text: 'أداة رائعة ومجانية لإنشاء وقراءة رموز QR Code احترافية. جربها الآن!',
        url: window.location.href
    };
    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) { console.log(err); }
    } else {
        navigator.clipboard.writeText(window.location.href);
        alert("تم نسخ رابط التطبيق للحافظة.");
    }
});

// --- 15. برمجة PWA (زر التثبيت) ---
let deferredPrompt;
const installAppBtn = document.getElementById('btn_install_app');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); 
    deferredPrompt = e; 
});

installAppBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt(); 
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
    } else {
        alert("📥 لتنزيل التطبيق:\n🍎 آيفون (Safari): اضغط 'المشاركة' -> 'إضافة للشاشة الرئيسية'.\n🤖 أندرويد (Chrome): اضغط 'الخيارات' -> 'تثبيت التطبيق'.");
    }
});

window.addEventListener('appinstalled', () => {
    installAppBtn.style.display = 'none';
});

// تسجيل عامل الخدمة (Service Worker)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((error) => console.log('فشل تسجيل SW:', error));
    });
}