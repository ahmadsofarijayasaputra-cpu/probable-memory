// @ts-nocheck
// === TOKEN TELEGRAM & KONFIGURASI ===
const TELEGRAM_TOKEN = "8750078178:AAENgPUEIdoDW3gt41lfQWTcbyYTbzcNCAY";
const GEMINI_API_KEY = "AQ.Ab8RN6JFVQerM9vTw2f61dWjWsYxZg-pM6iL_R1_mezQmwPPgA";

const PROTO = "https" + "://";
const TG_BASE = PROTO + "api.telegram.org/bot" + TELEGRAM_TOKEN;
const AI_OPENAI_URL = PROTO + "text.pollinations.ai/openai";
const AI_ROOT_URL = PROTO + "text.pollinations.ai/";
const GEMINI_URL = PROTO + "generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=";

const memoryStore = new Map();

// === OTAK 1: INSTRUKSI AI UNTUK MEMIKIRKAN PERTANYAAN DINAMIS SESUAI KONTEKS ===
const BRAIN_QUESTION_PROMPT = `Kamu adalah Senior Master Prompt Engineer.
Tugasmu: Pahami maksud permintaan pengguna (apakah ingin edit foto, buat gambar, video, coding, bisnis, penulisan, atau tugas lain), lalu tuliskan TEPAT 3 pertanyaan singkat dan paling krusial untuk menyempurnakan hasil akhirnya.

ATURAN WAJIB:
1. JANGAN mengulang kalimat "aku ingin prompt...". Fokus langsung pada hasil karya yang ingin dibuat pengguna.
2. Pertanyaan harus spesifik sesuai kategori permintaan pengguna:
   - Jika Edit Foto / Buat Gambar: tanyakan detail kostum/gaya visual, latar tempat/pencahayaan, serta pose/ekspresi/rasio.
   - Jika Video / Animasi: tanyakan gerakan kamera, aksi subjek, dan suasana visual.
   - Jika Coding / Web / Bot: tanyakan fitur utama, bahasa/framework, dan desain tampilan.
   - Jika Konten / Bisnis / Teks: tanyakan target audiens, gaya bahasa, dan struktur output.
3. Di setiap pertanyaan, berikan 2-3 contoh pilihan konkret di dalam kurung.
4. Langsung keluarkan daftar bernomor 1, 2, 3 tanpa kalimat pembuka atau penutup.`;

// === OTAK 2: INSTRUKSI AI UNTUK MERACIK PROMPT EKSEKUSI LANGSUNG (BUKAN PROMPT DI DALAM PROMPT) ===
const BRAIN_ENGINEER_PROMPT = `You are an Elite World-Class Prompt Engineer.
Your job is to write a READY-TO-USE, DIRECT EXECUTION PROMPT that the user will paste directly into an AI (ChatGPT, Gemini, Midjourney, Flux, Sora, Claude, Cursor) so the target AI IMMEDIATELY generates the final result (the edited photo, the image, the code, the video, or the document).

CRITICAL ANTI-LOOP RULES (MANDATORY):
1. NEVER repeat phrases like "Aku ingin prompt", "User wants a prompt", or "Write a prompt for". If you say that, the target AI will generate another prompt instead of executing the task!
2. ALWAYS write a DIRECT COMMAND to the target AI to produce the final artwork/code/content directly.
3. Adapt the prompt format intelligently to the user's request category:

- IF THE REQUEST IS PHOTO EDITING / FACE SWAP / CHARACTER TRANSFORMATION (e.g., turning user's photo into Loki, Shaun the Sheep style, anime, etc.):
  Write a direct, ultra-detailed Image-to-Image / Photo Transformation prompt:
  * Instruct the AI to use the uploaded reference photo and strictly preserve the subject's facial identity, facial structure, gaze, and key features.
  * Describe the target character/style transformation in rich visual detail (exact costume textures, iconic accessories, material shaders, claymation/3D/cinematic style, lighting, color grading, background environment, 8k resolution, photorealistic or studio-authentic rendering).
  * Provide both the ready-to-paste English Visual Prompt AND a natural Indonesian version for conversational AI (ChatGPT/Gemini).

- IF THE REQUEST IS TEXT-TO-IMAGE OR VIDEO GENERATION:
  Write a rich cinematic/visual generation prompt detailing subject, action, artistic style, camera lens, lighting, atmosphere, render quality, and negative prompts.

- IF THE REQUEST IS CODING, SYSTEM, WRITING, BUSINESS, OR ANALYSIS:
  Write a comprehensive, structured System & Task Execution Prompt that commands the target AI to act as a Top 0.1% Expert and immediately build/write the complete, production-ready solution in natural Bahasa Indonesia without placeholders.

Output ONLY the final ready-to-copy prompt text without wrapping it in markdown code fences (\`\`\`).`;

const workerHandler = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET") {
      const webhookUrl = `${url.origin}/`;
      const res = await fetch(`${TG_BASE}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
      const data = await res.json();
      return new Response(
        data.ok
          ? "✅ BERHASIL! Bot Master Prompt V8 (Smart Direct-Execution Brain) sudah aktif 24 jam! Silakan buka Telegram."
          : "❌ Gagal: " + JSON.stringify(data),
        { headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }

    if (request.method === "POST") {
      try {
        const update = await request.json();
        if (ctx && typeof ctx.waitUntil === "function") {
          ctx.waitUntil(handleTelegramUpdate(update, url.origin));
        } else {
          await handleTelegramUpdate(update, url.origin);
        }
      } catch (e) {
        console.error(e);
      }
      return new Response("OK");
    }

    return new Response("OK");
  }
};

if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  Deno.serve((req) => workerHandler.fetch(req, {}, null));
}

export default workerHandler;

// === PEMBERSIH KALIMAT "AKU INGIN PROMPT..." AGAR TIDAK JADI PROMPT DI DALAM PROMPT ===
function cleanUserIntent(rawText) {
  let cleaned = String(rawText || "").trim();
  cleaned = cleaned
    .replace(/^(halo|hai|min|bot|kak)[\s,!.]*/i, "")
    .replace(/^(tolong\s+)?(aku|saya|gue|gw)\s+(ingin|mau|pengin|pengen|minta|butuh)\s+(dibuatkan\s+|bikinin\s+|buat\s+|cariin\s+)?(sebuah\s+)?(prompt\s+)?(untuk\s+|buat\s+|agar\s+|supaya\s+)?/i, "")
    .replace(/^(tolong\s+)?(buatkan|bikinin|bikin|buat|generate|racik|tuliskan)\s+(aku\s+|saya\s+)?(sebuah\s+)?(prompt\s+)(untuk\s+|buat\s+|tentang\s+)?/i, "")
    .replace(/^prompt\s+(untuk\s+|buat\s+)?/i, "")
    .trim();
  if (!cleaned || cleaned.length < 3) return rawText.trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// === DETEKTOR KATEGORI PERMINTAAN USER (SEMUA JENIS PROMPT) ===
function detectCategory(topic) {
  const t = topic.toLowerCase();
  if (/(ubah\s*foto|edit\s*foto|fotoku|foto\s*ini|foto\s*saya|wajahku|wajah\s*saya|jadi\s*karakter|jadi\s*foto|ganti\s*baju|ganti\s*kostum|style\s+|gaya\s+.*foto|karakter\s+loki|shaun\s+the\s+sheep|kartun|anime|claymation|action\s*figure|ghibli|disney|pixar|marvel|cosplay)/i.test(t)) {
    return "PHOTO_EDIT";
  }
  if (/(video|animasi|sora|runway|kling|pika|cinematic\s*video|iklan\s*video|trailer|footage)/i.test(t)) {
    return "VIDEO_GEN";
  }
  if (/(gambar|ilustrasi|lukisan|poster|logo|desain\s*grafis|midjourney|dall-e|flux|stable\s*diffusion|3d\s*render|wallpaper|vector)/i.test(t)) {
    return "IMAGE_GEN";
  }
  if (/(coding|kode|program|script|website|web|aplikasi|app|html|css|javascript|js|python|php|react|nextjs|node|bot\s+|database|api|bug|error|game|roblox|lua)/i.test(t)) {
    return "CODING_TECH";
  }
  if (/(bisnis|usaha|jualan|marketing|iklan|strategi|keuangan|produk|brand|toko|umkm|pitch|proposal|analisis\s*pasar)/i.test(t)) {
    return "BUSINESS";
  }
  if (/(artikel|cerita|novel|naskah|script\s*tiktok|konten|thread|caption|copywriting|esai|makalah|skripsi|surat|cv|email|puisi|buku)/i.test(t)) {
    return "WRITING";
  }
  return "GENERAL";
}

async function handleTelegramUpdate(update, workerOrigin) {
  try {
    // === A. JIKA USER MENGKLIK TOMBOL ===
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;
      const msgText = cb.message.text || "";
      const action = cb.data;

      await fetch(`${TG_BASE}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cb.id })
      });

      const match = msgText.match(/📌 Topik: "(.*?)"/s);
      const saved = await loadSession(chatId, workerOrigin);
      const rawTopic = (match && match[1]) ? match[1] : (saved ? saved.topic : "Permintaan AI");
      const topic = cleanUserIntent(rawTopic);

      if (action === "NEW_TOPIC") {
        await deleteSession(chatId, workerOrigin);
        await sendTelegram(
          chatId,
          "🔄 <b>Siap! Silakan ketik topik atau prompt apa saja yang ingin kamu buat:</b>

" +
          "<i>(Bisa untuk Edit Foto, Gambar AI, Video, Coding, Bisnis, Konten, atau tugas apa pun!)</i>"
        );
        return;
      }

      if (action === "AUTO_GEN") {
        await deleteSession(chatId, workerOrigin);
        await sendTelegram(
          chatId,
          `🧠 <i>Otak AI sedang meracik <b>Master Prompt Terbaik</b> untuk: "${escapeHtml(topic)}"... (Tunggu ±5 detik)</i>`
        );
        await sendTyping(chatId);

        const autoSpecs = "Otomatis: Pilihkan sendiri detail visual/teknis, pencahayaan, komposisi, gaya terbaik, dan kualitas standar tertinggi yang paling sempurna untuk dieksekusi langsung.";
        const megaPrompt = await generateMegaPromptWithAI(topic, autoSpecs);
        await sendMegaPromptResult(chatId, topic, "⚡ Dipilihkan Otomatis oleh AI Terbaik", megaPrompt);
        return;
      }

      if (action === "MANUAL_INPUT") {
        await saveSession(chatId, { mode: "WAIT_MANUAL", topic: topic }, workerOrigin);
        const manualMsg =
          `📌 Topik: "<b>${escapeHtml(topic)}</b>"

` +
          `✍️ <b>Silakan balas dengan jawaban atau detail tambahan yang kamu inginkan dalam 1 pesan:</b>
` +
          `<i>(Ketik bebas saja, nanti Otak AI yang akan menyusunnya menjadi prompt siap pakai)</i>`;

        await sendTelegram(chatId, manualMsg, {
          force_reply: true,
          selective: true,
          input_field_placeholder: "Ketik detail spesifikasi yang kamu mau..."
        });
        return;
      }
      return;
    }

    // === B. JIKA USER MENGIRIM PESAN TEKS ATAU FOTO DENGAN CAPTION ===
    const incomingText = update.message ? (update.message.text || update.message.caption || "") : "";
    if (update.message && incomingText.trim()) {
      const chatId = update.message.chat.id;
      const text = incomingText.trim();

      if (text === "/start" || text === "/reset") {
        await deleteSession(chatId, workerOrigin);
        const welcome =
          "🧠 <b>Master Prompt Engineer OS (V8 - Smart Direct Brain)</b>

" +
          "Sistem peracik <b>Prompt Siap Pakai Standar Internasional</b> untuk segala jenis kebutuhanmu (Edit Foto, Generate Gambar/Video, Coding, Bisnis, Penulisan, dll).

" +
          "📌 <b>Cara Kerja:</b>
" +
          "1. Ketik bebas apa saja yang ingin kamu buat.
" +
          "2. Otak AI akan menganalisis maksudmu dan memberikan <b>pertanyaan spesifikasi khusus</b>.
" +
          "3. Klik tombol <b>⚡ Pilihkan Otomatis</b> atau <b>✍️ Jawab Sendiri</b>.
" +
          "4. Salin <b>Prompt Siap Eksekusi</b> yang langsung menghasilkan output di AI tujuanmu!

" +
          "👇 <i>Silakan ketik apa yang ingin kamu buat sekarang:</i>";

        await sendTelegram(chatId, welcome);
        return;
      }

      await sendTyping(chatId);

      const session = await loadSession(chatId, workerOrigin);
      let replyTopic = null;
      if (update.message.reply_to_message && update.message.reply_to_message.text) {
        const m = update.message.reply_to_message.text.match(/📌 Topik: "(.*?)"/s);
        if (m && m[1]) replyTopic = m[1];
      }

      const looksLikeNumberedAnswer = /^1[\.\)\s]/m.test(text);
      const isAnsweringSpecs =
        (session && session.mode === "WAIT_MANUAL") ||
        replyTopic !== null ||
        (session && session.topic && looksLikeNumberedAnswer);

      // JIKA USER SEDANG MENJAWAB SPESIFIKASI -> LANGSUNG RACIK PROMPT
      if (isAnsweringSpecs) {
        const activeTopic = cleanUserIntent(replyTopic || (session ? session.topic : "Permintaan Pengguna"));
        await deleteSession(chatId, workerOrigin);

        await sendTelegram(
          chatId,
          `🧠 <i>Otak AI sedang menyusun <b>Prompt Siap Pakai</b> berdasarkan spesifikasi kamu... (Tunggu ±5 detik)</i>`
        );
        await sendTyping(chatId);

        const megaPrompt = await generateMegaPromptWithAI(activeTopic, text);
        await sendMegaPromptResult(chatId, activeTopic, text, megaPrompt);
        return;
      }

      // JIKA USER MENGIRIM TOPIK BARU -> BERSIHKAN INTENT & BUAT PERTANYAAN DINAMIS
      const cleanedTopic = cleanUserIntent(text);
      await saveSession(chatId, { mode: "ASKED", topic: cleanedTopic }, workerOrigin);
      const dynamicQuestions = await generateDynamicQuestionsWithAI(cleanedTopic);

      const askMsg =
        `📌 Topik: "<b>${escapeHtml(cleanedTopic)}</b>"

` +
        `🧠 <b>Pertanyaan Analisis AI untuk Topikmu:</b>
` +
        `${escapeHtml(dynamicQuestions)}

` +
        `👇 <b>Pilih cara melanjutkannya lewat tombol di bawah:</b>
` +
        `• Klik <b>⚡ Pilihkan Otomatis</b> agar AI langsung meracik prompt paling maksimal.
` +
        `• Klik <b>✍️ Jawab Sendiri</b> jika ingin mengatur detailnya sesuai keinginanmu.`;

      const buttons = {
        inline_keyboard: [
          [{ text: "⚡ Pilihkan Otomatis (Rekomendasi AI)", callback_data: "AUTO_GEN" }],
          [{ text: "✍️ Jawab Sendiri (Isi Manual)", callback_data: "MANUAL_INPUT" }],
          [{ text: "🔄 Ganti Topik Lain", callback_data: "NEW_TOPIC" }]
        ]
      };

      await sendTelegram(chatId, askMsg, buttons);
    }
  } catch (err) {
    console.error("Handler error:", err);
  }
}

// === OTAK AI 1: MEMBUAT PERTANYAAN DINAMIS SESUAI KATEGORI TOPIK ===
async function generateDynamicQuestionsWithAI(topic) {
  const category = detectCategory(topic);
  const userMsg =
    `Permintaan pengguna: "${topic}" (Kategori: ${category}).
` +
    `Tuliskan 3 pertanyaan spesifikasi paling tepat beserta contoh pilihannya di dalam kurung dalam Bahasa Indonesia.`;

  const aiResponse = await callAIBrain(BRAIN_QUESTION_PROMPT, userMsg, 12000);
  if (aiResponse && aiResponse.length > 30 && !aiResponse.includes("<!DOCTYPE")) {
    return aiResponse.replace(/\*\*/g, "").trim();
  }

  // Pertanyaan Cerdas Berdasarkan Kategori jika API eksternal sedang sibuk
  if (category === "PHOTO_EDIT") {
    return (
      `1. Detail Kostum & Gaya Visual: (Ingin tampilan sinematik realistis seperti film asli, animasi 3D claymation/stop-motion, atau ilustrasi digital?)
` +
      `2. Pertahankan Wajah & Pose: (Wajah asli dari foto tetap dipertahankan 100% mirip, hanya ubah kostum/gaya karakter, atau ikut ubah pose tubuh?)
` +
      `3. Latar Belakang & Pencahayaan: (Ingin latar tempat ikonik sesuai tema karakter dengan efek cahaya dramatis, atau latar studio bersih?)`
    );
  }
  if (category === "IMAGE_GEN") {
    return (
      `1. Gaya Visual & Kamera: (Photorealistic 8K, 3D Pixar/Claymation, Anime Studio, atau Cinematic Film?)
` +
      `2. Pencahayaan & Suasana: (Dramatic lighting, golden hour hangat, neon cyberpunk, atau terang natural?)
` +
      `3. Rasio & Komposisi: (Potret 9:16 untuk TikTok/Reels, kotak 1:1, atau lanskap 16:9?)`
    );
  }
  if (category === "VIDEO_GEN") {
    return (
      `1. Gerakan Kamera & Subjek: (Slow-motion sinematik, drone mengikuti subjek, atau zoom-in dramatis?)
` +
      `2. Gaya Visual & Atmosfer: (Realistis seperti film layar lebar, animasi 3D, atau fantasi epik?)
` +
      `3. Durasi & Rasio Video: (Vertikal 9:16 untuk Reels/TikTok atau Horizontal 16:9 YouTube?)`
    );
  }
  if (category === "CODING_TECH") {
    return (
      `1. Bahasa & Teknologi: (Ingin menggunakan HTML/CSS/JS, Python, Node.js, React, atau dibebaskan yang paling praktis?)
` +
      `2. Fitur Utama yang Wajib Ada: (Sebutkan fungsi atau menu spesifik yang harus langsung berjalan)
` +
      `3. Tampilan & Output: (Ingin langsung full code 1 file siap pakai dengan desain modern responsif?)`
    );
  }
  if (category === "BUSINESS" || category === "WRITING") {
    return (
      `1. Target Audiens & Tujuan: (Untuk anak muda/Gen-Z, profesional, pembeli umum, atau tugas formal?)
` +
      `2. Gaya Bahasa & Tone: (Santai persuasif, bikin penasaran/viral, atau formal terstruktur?)
` +
      `3. Format Hasil Akhir: (Langsung naskah siap pakai lengkap dengan hook & call-to-action, atau poin strategi?)`
    );
  }

  return (
    `1. Fokus & Gaya Utama: (Ingin hasil akhir untuk "${topic}" dibuat dengan gaya santai, profesional, kreatif, atau teknis mendalam?)
` +
    `2. Detail Khusus yang Diinginkan: (Ada elemen, aturan, atau bagian penting yang wajib dimasukkan?)
` +
    `3. Format Output: (Ingin hasil yang langsung jadi dan siap pakai dalam 1 kali eksekusi?)`
  );
}

// === OTAK AI 2: MERACIK PROMPT EKSEKUSI LANGSUNG (BUKAN MENGULANG KALIMAT USER) ===
async function generateMegaPromptWithAI(topic, specs) {
  const category = detectCategory(topic);
  const userMsg =
    `CORE TASK TO EXECUTE: "${topic}"
` +
    `DETECTED CATEGORY: ${category}
` +
    `USER SPECIFICATIONS: "${specs}"

` +
    `IMPORTANT: Do NOT write a prompt that asks another AI to write a prompt. Write the ACTUAL, DIRECT, READY-TO-USE PROMPT that commands the target AI to immediately generate the final output for "${topic}". Expand all details creatively and professionally.`;

  const aiResponse = await callAIBrain(BRAIN_ENGINEER_PROMPT, userMsg, 20000);
  if (aiResponse && aiResponse.length > 120 && !aiResponse.includes("<!DOCTYPE")) {
    return aiResponse.replace(/```xml|```html|```markdown|```/gi, "").trim();
  }

  // === SMART SYNTHESIZER FALLBACK (JIKA SERVER EKSTERNAL SIBUK, TETAP MERACIK PROMPT SPESIFIK & BUKAN NGETIK ULANG) ===
  return buildSmartDirectPrompt(topic, specs, category);
}

function buildSmartDirectPrompt(topic, specs, category) {
  const isAuto = specs.startsWith("Otomatis:");
  const customNote = isAuto ? "" : `
- Spesifikasi Tambahan: ${specs}`;

  if (category === "PHOTO_EDIT") {
    const tLow = topic.toLowerCase();
    let styleDesc = `Transform the subject from the uploaded reference photo into the requested concept: "${topic}".`;
    let detailsDesc = `Strictly preserve the original person's facial identity, facial bone structure, eye expression, and recognizable features from the reference photo while seamlessly transforming their outfit, styling, and environment.`;

    if (tLow.includes("loki")) {
      styleDesc = `Transform the person in the uploaded reference photo into the iconic Marvel Cinematic Universe character Loki (God of Mischief), while keeping 100% of the original person's real facial features, face shape, and likeness intact.`;
      detailsDesc =
        `- Costume & Wardrobe: Dress the subject in Loki's signature intricate Asgardian leather and金屬 armor in deep emerald green, black, and brushed metallic gold, complete with the iconic golden horned helmet/crown and flowing green cape.
` +
        `- Lighting & Atmosphere: Cinematic Marvel movie lighting with mystical green magical energy glowing subtly around the hands, dramatic rim light, and an atmospheric Asgardian throne room or dark cosmic background.
` +
        `- Quality & Realism: Ultra-photorealistic 8K movie still, seamless face integration, natural skin texture, ARRI Alexa 65 lens look, shallow depth of field.`;
    } else if (tLow.includes("shaun the sheep") || tLow.includes("clay") || tLow.includes("aardman")) {
      styleDesc = `Transform the person and scene in the uploaded reference photo into an authentic "Shaun the Sheep" (Aardman Animations) 3D stop-motion plasticine claymation style character.`;
      detailsDesc =
        `- Character & Likeness: Keep the person's recognizable hairstyle, glasses/accessories, pose, and outfit colors from the original photo, but sculpt them entirely out of handcrafted stop-motion clay/plasticine with signature Aardman expressive eyes and charming proportions.
` +
        `- Environment & Texture: Set in the sunny Mossy Bottom Farm British countryside with green pastures, stone walls, and fluffy clay sheep in the background. Include visible subtle thumbprints and handcrafted clay textures.
` +
        `- Lighting & Render: Warm stop-motion miniature studio lighting, tilt-shift macro lens effect, vibrant playful colors, 8K stop-motion film quality.`;
    }

    return (
`[PROMPT BAHASA INGGRIS - TEMPEL KE CHATGPT / GEMINI / IMAGE AI BERSAMA FOTOMU]

Use the uploaded photo as the primary facial and composition reference. ${styleDesc}

Visual & Technical Instructions:
${detailsDesc}${customNote}
- Do NOT alter the person's core identity; ensure the face remains clearly recognizable as the person in the original photo.
- High-definition 8K resolution, masterwork quality, flawless blending, zero distortion.

---

[PROMPT BAHASA INDONESIA - SIAP TEMPEL]

Ubah foto yang saya unggah ini sesuai konsep: ${topic}.
Instruksi Wajib:
1. Pertahankan 100% kemiripan wajah asli, struktur muka, dan ekspresi dari foto saya agar tetap dikenali dengan jelas.
2. Ubah kostum, atribut, pencahayaan, tekstur visual, dan latar belakang secara sinematik dan sangat detail mengikuti tema tersebut.${customNote}
3. Pastikan hasil akhirnya terlihat sangat rapi, proporsional, resolusi tinggi 8K, dan menyatu sempurna tanpa terlihat seperti tempelan.`
    );
  }

  if (category === "IMAGE_GEN" || category === "VIDEO_GEN") {
    return (
`[DIRECT VISUAL GENERATION PROMPT]

Create a breathtaking, studio-grade masterpiece of: ${topic}.

Detailed Visual Parameters:
- Core Subject & Action: Render "${topic}" with extraordinary micro-detail, dynamic composition, and lifelike textures.
- Cinematography & Lighting: Shot on 35mm prime lens, f/1.8 aperture, volumetric cinematic lighting, rich color grading, dramatic shadows and highlights.
- Quality & Style: 8K ultra-detailed resolution, photorealistic/studio rendering, Unreal Engine 5 / Octane Render fidelity, zero artifacts, anatomically and structurally accurate.${customNote}`
    );
  }

  // Untuk Coding, Bisnis, Penulisan, dan Umum -> Perintahkan AI tujuan untuk LANGSUNG MENGERJAKAN (Bukan buat prompt lagi)
  return (
`Bertindaklah sebagai Pakar Terbaik (Top 0.1% Expert Specialist) di bidang ini.
Tugas utama Anda adalah LANGSUNG MENGERJAKAN dan menghasilkan output akhir yang lengkap, mendalam, dan siap pakai untuk permintaan berikut:

👉 Tugas Utama: ${topic}
${isAuto ? "👉 Spesifikasi: Gunakan standar industri terbaik, struktur paling rapi, dan detail paling komprehensif." : `👉 Spesifikasi Khusus: ${specs}`}

Aturan Eksekusi Wajib:
1. JANGAN membuat prompt lagi dan jangan mengulang instruksi ini. Langsung berikan hasil/solusi/kode/tulisan akhirnya secara utuh!
2. Buat hasilnya sangat detail, praktis, profesional, tanpa ada bagian yang dipotong (tanpa placeholder).
3. Gunakan Bahasa Indonesia yang natural, jelas, tajam, dan langsung ke inti.`
  );
}

// === MESIN PEMANGGIL LLM MULTI-JALUR ===
async function callAIBrain(systemPrompt, userMessage, timeoutMs = 15000) {
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://pollinations.ai/"
  };

  // Jalur 0: Google Gemini API (Jika API Key valid)
  if (GEMINI_API_KEY && GEMINI_API_KEY.startsWith("AIza")) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(`${GEMINI_URL}${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: { temperature: 0.7 }
        })
      });
      clearTimeout(t);
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text.trim();
    } catch (e) {}
  }

  // Jalur 1: Pollinations OpenAI Endpoint dengan model fallback
  const models = ["openai", "mistral"];
  for (const mdl of models) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(AI_OPENAI_URL, {
        method: "POST",
        headers: headers,
        signal: ctrl.signal,
        body: JSON.stringify({
          model: mdl,
          seed: Math.floor(Math.random() * 999999),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ],
          temperature: 0.7
        })
      });
      clearTimeout(t);
      if (res.ok) {
        const raw = await res.text();
        try {
          const json = JSON.parse(raw);
          const content = json.choices?.[0]?.message?.content;
          if (content && content.length > 30) return content.trim();
        } catch {
          if (raw && raw.length > 30 && !raw.includes("<!DOCTYPE")) return raw.trim();
        }
      }
    } catch (e) {}
  }

  // Jalur 2: Root Endpoint POST
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(AI_ROOT_URL, {
      method: "POST",
      headers: headers,
      signal: ctrl.signal,
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        model: "openai",
        seed: Math.floor(Math.random() * 999999)
      })
    });
    clearTimeout(t);
    if (res.ok) {
      const raw = await res.text();
      if (raw && raw.length > 30 && !raw.includes("<!DOCTYPE")) {
        try {
          const json = JSON.parse(raw);
          if (json.choices?.[0]?.message?.content) return json.choices[0].message.content.trim();
        } catch {
          return raw.trim();
        }
      }
    }
  } catch (e) {}

  return null;
}

// === PENGIRIM HASIL PROMPT SIAP PAKAI ===
async function sendMegaPromptResult(chatId, topic, specs, rawPrompt) {
  const trimmedPrompt = rawPrompt.length > 3400
    ? rawPrompt.slice(0, 3400)
    : rawPrompt;

  const trimmedTopic = topic.length > 150 ? topic.slice(0, 150) + "..." : topic;
  const trimmedSpecs = specs.length > 200 ? specs.slice(0, 200) + "..." : specs;

  const htmlMsg =
    `✅ <b>PROMPT SIAP DIGUNAKAN!</b>
` +
    `📌 <b>Tujuan:</b> ${escapeHtml(trimmedTopic)}
` +
    `⚙️ <b>Spesifikasi:</b> ${escapeHtml(trimmedSpecs)}

` +
    `👇 <i>Ketuk <b>Copy Code</b> di bawah, lalu tempelkan ke AI tujuanmu (ChatGPT, Gemini, Midjourney, Claude, Sora, dll):</i>

` +
    `<pre><code>${escapeHtml(trimmedPrompt)}</code></pre>`;

  const buttons = {
    inline_keyboard: [
      [{ text: "🔄 Buat Prompt Baru Lainnya", callback_data: "NEW_TOPIC" }]
    ]
  };

  await sendTelegram(chatId, htmlMsg, buttons);
}

// === PENYIMPAN SESI ===
async function saveSession(chatId, dataObj, origin) {
  memoryStore.set(chatId, dataObj);
  try {
    if (typeof caches !== "undefined" && caches.default) {
      const cache = caches.default;
      const req = new Request(`${origin}/__session/${chatId}`);
      const res = new Response(JSON.stringify(dataObj), {
        headers: { "Content-Type": "application/json", "Cache-Control": "max-age=3600" }
      });
      await cache.put(req, res);
    }
  } catch (e) {}
}

async function loadSession(chatId, origin) {
  if (memoryStore.has(chatId)) return memoryStore.get(chatId);
  try {
    if (typeof caches !== "undefined" && caches.default) {
      const cache = caches.default;
      const req = new Request(`${origin}/__session/${chatId}`);
      const res = await cache.match(req);
      if (res) return await res.json();
    }
  } catch (e) {}
  return null;
}

async function deleteSession(chatId, origin) {
  memoryStore.delete(chatId);
  try {
    if (typeof caches !== "undefined" && caches.default) {
      const cache = caches.default;
      const req = new Request(`${origin}/__session/${chatId}`);
      await cache.delete(req);
    }
  } catch (e) {}
}

async function sendTyping(chatId) {
  await fetch(`${TG_BASE}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" })
  });
}

async function sendTelegram(chatId, htmlText, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    text: htmlText,
    parse_mode: "HTML"
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  const res = await fetch(`${TG_BASE}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!data.ok) {
    const plainPayload = {
      chat_id: chatId,
      text: htmlText.replace(/<[^>]+>/g, "").slice(0, 4000)
    };
    if (replyMarkup) plainPayload.reply_markup = replyMarkup;
    await fetch(`${TG_BASE}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plainPayload)
    });
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
