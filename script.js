// العناصر
const themeToggle = document.querySelector('.theme-toggle'); 
const promptBtn = document.querySelector('.prompt-btn');
const promptInput = document.querySelector('.prompt-input');
const promptForm = document.querySelector('.prompt-form');
const modelSelect = document.querySelector('#model-select');
const countSelect = document.querySelector('#count-select');
const ratioSelect = document.querySelector('#ratio-select');
const galleryGrid = document.querySelector('.gallery-grid');

// مفتاح AI Horde (احصلي عليه من https://aihorde.net/register)
const HORDE_API_KEY = "Put your key here.";

// أمثلة عشوائية
const examplePrompts = [
 "A glowing waterfall in a hidden jungle surrounded by bioluminescent plants",
  "A futuristic floating city above the clouds powered by solar crystals",
  "A peaceful lake reflecting a sky filled with twin moons and auroras",
  "A giant ancient tree with houses built inside its branches, softly lit at night",
  "A crystal desert with shimmering dunes under a purple sunset",
  "An underwater temple with glowing coral and mysterious sea creatures",
  "A mountain village above the clouds with floating lanterns at dusk",
  "A sci-fi observatory on an alien planet surrounded by blue fog and glowing rocks",
  "A magical garden where time stands still, filled with floating lights and rare flowers",
  "A tranquil forest path illuminated by glowing fireflies and moonlight",
  "A futuristic greenhouse on Mars growing alien plants in glass domes",
  "A fantasy castle built on a cliff above a sea of mist, with dragons flying around",
  "A glowing meadow at midnight under an enormous full moon",
  "A city made of crystal towers reflecting rainbow light during sunrise",
  "A serene winter village covered in snow with warm golden lights from cabins"
];

// ---- تهيئة الثيم ----
(() => {
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; 
  const isDarkTheme = savedTheme === "dark" || (!savedTheme && systemPrefersDark);
  document.body.classList.toggle('dark-theme', isDarkTheme);
  themeToggle.querySelector("i").className = isDarkTheme ? "fa-solid fa-sun" : "fa-solid fa-moon";
})();

const toggleTheme = () => {
  const isDarkTheme = document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', isDarkTheme ? "dark" : "light");
  themeToggle.querySelector("i").className = isDarkTheme ? "fa-solid fa-sun" : "fa-solid fa-moon";
};

// ---- توليد عشوائي ----
const generateImage = () => {
  const prompt = examplePrompts[Math.floor(Math.random() * examplePrompts.length)];
  promptInput.value = prompt;
  promptInput.focus();
};

// ---- حساب الأبعاد ----
const getImageDimensions = (aspectRatio, baseSize = 512) => {
  const [width, height] = aspectRatio.split("/").map(Number);
  const scaleFactor = baseSize / Math.sqrt(width * height);
  let calculatedWidth = Math.round(scaleFactor * width);
  let calculatedHeight = Math.round(scaleFactor * height);
  calculatedWidth = Math.floor(calculatedWidth / 16) * 16;
  calculatedHeight = Math.floor(calculatedHeight / 16) * 16;
  return { width: calculatedWidth, height: calculatedHeight };
};

// ---- تحديث البطاقة ----
const updateImageCard = (imgIndex, imgUrl) => {
  const imgCard = document.getElementById(`img-card-${imgIndex}`);
  if (!imgCard) return;
  imgCard.classList.remove("loading");
  imgCard.innerHTML = `
    <img src="${imgUrl}" class="result-img"/>
    <div class="img-overlay">
      <a href="${imgUrl}" class="img-download-btn" download="${Date.now()}.png">
        <i class="fa-solid fa-download"></i>
      </a>
    </div>`;
};

// ---- التوليد عبر AI Horde ----
const generateImages = async (selectModel, selectCount, selectRatio, prompt) => {
    const { width, height } = getImageDimensions(selectRatio);
  
    const payload = {
      prompt: prompt,
      params: {
        n: selectCount,       // عدد الصور
        width: width,
        height: height,
        steps: 25,
        cfg_scale: 7,
        sampler_name: "k_euler",
      },
      nsfw: false,
      models: [selectModel],  // اسم النموذج ضمن مصفوفة
    };
  
    try {
      // إرسال الطلب
      const response = await fetch("https://aihorde.net/api/v2/generate/async", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": HORDE_API_KEY,
        },
        body: JSON.stringify(payload),
      });
  
      // التحقق من نجاح الطلب
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("Horde API Error:", errData);
        throw new Error(errData.message || "Failed to start generation.");
      }
  
      const data = await response.json();
      const jobId = data.id;
      if (!jobId) throw new Error("Failed to start generation.");
  
      console.log("🧠 Job started:", jobId);
  
      // الانتظار لحين انتهاء التوليد
      let result;
      while (true) {
        const check = await fetch(`https://aihorde.net/api/v2/generate/status/${jobId}`);
        const status = await check.json();
  
        if (status.done) {
          result = status.generations;
          break;
        }
  
        // تحديث حالة البطاقة أثناء الانتظار
        document.querySelectorAll(".status-text").forEach(el => el.textContent = `Generating... ${status.wait_time}s`);
        await new Promise(r => setTimeout(r, 7000));
      }
  
      // عرض الصور النهائية
      if (result && result.length > 0) {
        result.slice(0, selectCount).forEach((gen, i) => {
          updateImageCard(i, gen.img);
        });
      } else {
        throw new Error("No images returned from AI Horde.");
      }
  
    } catch (err) {
      console.error("Error:", err);
    }
  };
  

// ---- إنشاء البطاقات ----
const createImageCards = (selectModel, selectCount, selectRatio, prompt) => {
  galleryGrid.innerHTML = "";
  for (let i = 0; i < selectCount; i++) {
    galleryGrid.innerHTML += `
      <div class="img-card loading" id="img-card-${i}" style="aspect-ratio:${selectRatio}">
        <div class="status-container">
          <div class="spinner"></div>
          <i class="fa-solid fa-triangle-exclamation"></i>
          <p class="status-text">Generating...</p>
        </div>
      </div>`;
  }
  generateImages(selectModel, selectCount, selectRatio, prompt);
};

// ---- عند الإرسال ----
const hundleFormSubmit = (e) => {
  e.preventDefault();
  const selectModel = modelSelect.value || "stable_diffusion";
  const selectCount = parseInt(countSelect.value) || 1;
  const selectRatio = ratioSelect.value || "1/1";
  const prompt = promptInput.value.trim() || "A beautiful landscape, 4k, ultra detailed";
  //  فلتر للكلمات غير اللائقة (محتوى NSFW)
const forbiddenWords = [
  "nude", "naked", "nsfw", "sex", "erotic", "boobs", "breast", 
  "underwear", "bikini", "lingerie", "nipple", "genital", "porn"
];

let safePrompt = prompt;
for (const word of forbiddenWords) {
  const regex = new RegExp("\\b" + word + "\\b", "gi");
  safePrompt = safePrompt.replace(regex, "");
}

// إضافة عبارة تؤكد أن الصورة آمنة
safePrompt += ", family-friendly, safe content, appropriate lighting, fully clothed";

// توليد الصور بالكلمات الآمنة فقط
createImageCards(selectModel, selectCount, selectRatio, safePrompt);

};
// ---- تحميل الصورة عند الضغط على أيقونة التحميل ----
document.addEventListener('click', function (e) {
    const downloadBtn = e.target.closest('.img-download-btn'); 
    if (downloadBtn) {
      e.preventDefault(); // منع فتح الصورة فقط
      
      const img = downloadBtn.closest('.img-card').querySelector('img');
      const imageUrl = img.src;
  
      // إنشاء رابط تحميل مؤقت بنفس رابط الصورة (بدون fetch)
      const link = document.createElement('a');
      link.href = imageUrl;
      link.setAttribute('download', `generated_image_${Date.now()}.png`);
      link.setAttribute('target', '_blank'); // fallback إذا لم يدعم المتصفح التحميل
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  });
  
  
  

// ---- الأحداث ----
promptBtn.addEventListener('click', generateImage);
themeToggle.addEventListener('click', toggleTheme);
promptForm.addEventListener('submit', hundleFormSubmit);
