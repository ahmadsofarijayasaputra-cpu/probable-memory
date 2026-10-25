// === TOKEN TELEGRAM & KONFIGURASI ===
const TELEGRAM_TOKEN = "8750078178:AAENgPUEIdoDW3gt41lfQWTcbyYTbzcNCAY";
const GEMINI_API_KEY = "AQ.Ab8RN6JFVQerM9vTw2f61dWjWsYxZg-pM6iL_R1_mezQmwPPgA";

// Pemisah protokol agar URL tidak pernah rusak saat di-copy lewat HP
const PROTO = "https" + "://";
const TG_BASE = PROTO + "api.telegram.org/bot" + TELEGRAM_TOKEN;
const AI_OPENAI_URL = PROTO + "text.pollinations.ai/openai";
const AI_ROOT_URL = PROTO + "text.pollinations.ai/";
const GEMINI_URL = PROTO + "generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=";

const memoryStore = new Map();

// === OTAK 1: INSTRUKSI AI UNTUK MEMIKIRKAN PERTANYAAN DINAMIS ===
const BRAIN_QUESTION_PROMPT = `Kamu adalah Senior Master Prompt Engineer yang sangat cerdas dan kritis.
Pengguna akan memberikan sebuah topik atau permintaan prompt (bisa tentang apa saja: coding, video AI, edit foto, game, bisnis, penulisan, desain, sistem, dll).

Tugasmu:
Pikirkan dan tuliskan TEPAT 3 sampai 4 pertanyaan spesifikasi paling krusial yang harus diketahui agar kamu bisa meracik Master Prompt yang 100% sempurna dan sangat detail untuk topik tersebut.

ATURAN WAJIB:
1. Pertanyaan harus spesifik menyesuaikan topik pengguna (JANGAN gunakan pertanyaan umum yang kaku).
2. Di setiap pertanyaan, berikan 2-3 contoh pilihan konkret di dalam kurung agar pengguna mudah menjawab.
3. Gunakan Bahasa Indonesia yang jelas, cerdas, dan langsung ke inti.
4. Langsung keluarkan daftar bernomor 1, 2, 3 (dan 4 jika perlu) tanpa kalimat pembuka/penutup.`;

// === OTAK 2: INSTRUKSI AI UNTUK MERACIK MEGA-PROMPT SUPER DETAIL ===
const BRAIN_ENGINEER_PROMPT = `You are a Principal Prompt Engineer and World-Class AI Architect.
Your ONLY task is to engineer an ultra-comprehensive, deeply detailed, production-grade "Master Prompt" based on the user's topic and specifications.
DO NOT answer or execute the user's request yourself. You must write the MASTER PROMPT that the user will copy and paste into their target AI (ChatGPT, Claude, Gemini, Midjourney, Runway, Sora, Cursor, etc.).

MANDATORY RULES FOR MAXIMUM QUALITY:
1. Write the Master Prompt in high-precision, authoritative ENGLISH (as LLMs and AI generators achieve peak reasoning and fidelity in English), while explicitly instructing the target AI at the end to deliver explanations/UI/text in natural Bahasa Indonesia.
2. Make the prompt EXTREMELY DETAILED, thorough, and exhaustive. Expand short user inputs into rich professional parameters, industry frameworks, technical terminology, and exact quality standards.
3. Structure the Master Prompt using these exact XML/HTML Engineering blocks:

<system_role>
(Define an elite Top 0.1% specialist persona with specific credentials, deep domain mastery, and analytical mindset tailored to the topic)
</system_role>

<mission_objective>
(Write a crystal-clear, comprehensive mission statement detailing what the AI must build, generate, or solve and the exact standard of excellence required)
</mission_objective>

<comprehensive_specifications>
(Break down all technical, creative, structural, visual, or functional requirements in deep bullet points. Translate the user's specifications into elite professional parameters, adding all necessary best-practice details they didn't think of)
</comprehensive_specifications>

<step_by_step_workflow>
(Provide a strict Chain-of-Thought methodology: Step 1, Step 2, Step 3, Step 4 that the target AI must follow internally and externally to guarantee a masterpiece result)
</step_by_step_workflow>

<ready_to_use_prompt_block>
(If the request is for Image/Video/Audio generation, include a dedicated cohesive paragraph of high-end visual/cinematic descriptors, camera lenses, lighting, render engines, and negative prompts. If it is for Coding/Text/Business, specify the exact architecture/template structure required)
</ready_to_use_prompt_block>

<strict_constraints>
(Enforce strict quality control: zero placeholders, no truncated code, no generic clichés, no lazy summaries, 100% production-ready output)
</strict_constraints>

<output_format_and_language>
(Define the exact deliverable layout and instruct: "Deliver all final explanations, copywriting, and user-facing text in natural, professional Bahasa Indonesia, while maintaining world-class technical and creative execution.")
</output_format_and_language>

Output ONLY the raw XML structured prompt above. Do NOT wrap the output in markdown code blocks (\`\`\`).`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. AKTIVASI WEBHOOK SAAT LINK DIBUKA DI BROWSER
    if (request.method === "GET") {
      const webhookUrl = `${url.origin}/`;
      const res = await fetch(`${TG_BASE}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
      const data = await res.json();
      return new Response(
        data.ok
          ? "✅ BERHASIL! Bot Master Prompt V7 (Deep AI Brain) sudah aktif 24 jam! Silakan buka Telegram."
          : "❌ Gagal: " + JSON.stringify(data),
        { headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }

    // 2. PROSES PESAN & TOMBOL SECARA ASINKRON (ANTI-TIMEOUT)
    if (request.method === "POST") {
      try {
        const update = await request.json();
        ctx.waitUntil(handleTelegramUpdate(update, url.origin));
      } catch (e) {
        console.error(e);
      }
      return new Response("OK");
    }

    return new Response("OK");
  }
};

async function handleTelegramUpdate(update, workerOrigin) {
  try {
    // === A. JIKA USER MENGKLIK TOMBOL ===
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;
      const msgText = cb.message.text || "";
      const action = cb.data;

      // Matikan animasi loading pada tombol
      await fetch(`${TG_BASE}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cb.id })
      });

      // Ambil topik dari pesan atau dari memori
      const match = msgText.match(/📌 Topik: "(.*?)"/s);
      const saved = await loadSession(chatId, workerOrigin);
      const topic = (match && match[1]) ? match[1] : (saved ? saved.topic : "Pembuatan Sistem & Konten AI");

      // Tombol: Buat Prompt / Topik Baru
      if (action === "NEW_TOPIC") {
        await deleteSession(chatId, workerOrigin);
        await sendTelegram(
          chatId,
          "🔄 <b>Siap! Silakan ketik topik atau prompt apa saja yang ingin kamu buat:</b>\n\n" +
          "<i>(Otak AI akan otomatis menganalisis topikmu dan menyiapkan pertanyaan yang paling pas)</i>"
        );
        return;
      }

      // Tombol: Pilihkan Otomatis oleh Otak AI
      if (action === "AUTO_GEN") {
        await deleteSession(chatId, workerOrigin);
        await sendTelegram(
          chatId,
          `🧠 <i>Otak AI sedang meracik <b>Master Prompt Super Detail</b> untuk: "${escapeHtml(topic)}"... (Tunggu ±5 detik)</i>`
        );
        await sendTyping(chatId);

        const autoSpecs = "Otomatis: Pilihkan sendiri spesifikasi teknis, gaya, kerangka kerja, dan detail kualitas level tertinggi (Top 0.1% Industry Standard) yang paling sempurna untuk topik ini.";
        const megaPrompt = await generateMegaPromptWithAI(topic, autoSpecs);
        await sendMegaPromptResult(chatId, topic, "⚡ Dipilihkan Otomatis oleh AI Terbaik", megaPrompt);
        return;
      }

      // Tombol: Jawab Spesifikasi Secara Manual
      if (action === "MANUAL_INPUT") {
        await saveSession(chatId, { mode: "WAIT_MANUAL", topic: topic }, workerOrigin);
        const manualMsg =
          `📌 Topik: "<b>${escapeHtml(topic)}</b>"\n\n` +
          `✍️ <b>Silakan balas dengan jawaban atau detail yang kamu inginkan dalam 1 pesan:</b>\n` +
          `<i>(Ketik bebas saja, nanti Otak AI yang akan menyempurnakannya menjadi bahasa teknis Prompt Engineering)</i>`;

        await sendTelegram(chatId, manualMsg, {
          force_reply: true,
          selective: true,
          input_field_placeholder: "Ketik detail spesifikasi yang kamu mau..."
        });
        return;
      }
      return;
    }

    // === B. JIKA USER MENGIRIM PESAN TEKS ===
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();

      if (text === "/start" || text === "/reset") {
        await deleteSession(chatId, workerOrigin);
        const welcome =
          "🧠 <b>Master Prompt Engineer OS (V7 - Deep AI Brain)</b>\n\n" +
          "Sistem peracik <b>Mega-Prompt Standar Internasional</b> yang punya otak analisis untuk segala jenis kebutuhanmu.\n\n" +
          "📌 <b>Cara Kerja:</b>\n" +
          "1. Ketik bebas apa saja yang ingin kamu buat.\n" +
          "2. Otak AI akan menganalisis topikmu dan memberikan <b>pertanyaan spesifikasi khusus</b>.\n" +
          "3. Klik tombol <b>⚡ Pilihkan Otomatis</b> atau <b>✍️ Jawab Sendiri</b>.\n" +
          "4. Salin <b>Mega-Prompt</b> super detail yang siap dipakai di AI mana pun!\n\n" +
          "👇 <i>Silakan ketik apa yang ingin kamu buat sekarang:</i>";

        await sendTelegram(chatId, welcome);
        return;
      }

      await sendTyping(chatId);

      // Cek apakah pesan ini adalah jawaban spesifikasi dari user
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

      // JIKA USER SEDANG MENJAWAB SPESIFIKASI -> LANGSUNG RACIK MEGA-PROMPT
      if (isAnsweringSpecs) {
        const activeTopic = replyTopic || (session ? session.topic : "Permintaan Khusus Pengguna");
        await deleteSession(chatId, workerOrigin);

        await sendTelegram(
          chatId,
          `🧠 <i>Otak AI sedang menyusun <b>Mega-Prompt Engineering</b> berdasarkan spesifikasi kamu... (Tunggu ±5 detik)</i>`
        );
        await sendTyping(chatId);

        const megaPrompt = await generateMegaPromptWithAI(activeTopic, text);
        await sendMegaPromptResult(chatId, activeTopic, text, megaPrompt);
        return;
      }

      // JIKA USER MENGIRIM TOPIK BARU -> OTAK AI MEMIKIRKAN PERTANYAAN KHUSUS
      await saveSession(chatId, { mode: "ASKED", topic: text }, workerOrigin);
      const dynamicQuestions = await generateDynamicQuestionsWithAI(text);

      const askMsg =
        `📌 Topik: "<b>${escapeHtml(text)}</b>"\n\n` +
        `🧠 <b>Pertanyaan Analisis AI untuk Topikmu:</b>\n` +
        `${escapeHtml(dynamicQuestions)}\n\n` +
        `👇 <b>Pilih cara melanjutkannya lewat tombol di bawah:</b>\n` +
        `• Klik <b>⚡ Pilihkan Otomatis</b> agar AI langsung memilihkan spesifikasi paling maksimal.\n` +
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

// === OTAK AI 1: MEMBUAT PERTANYAAN DINAMIS SESUAI TOPIK ===
async function generateDynamicQuestionsWithAI(topic) {
  const userMsg = `Topik yang diminta pengguna: "${topic}".\nAnalisis topik ini dan buatkan 3-4 pertanyaan spesifikasi paling penting beserta contoh pilihannya.`;
  const aiResponse = await callAIBrain(BRAIN_QUESTION_PROMPT, userMsg, 12000);

  if (aiResponse && aiResponse.length > 30) {
    return aiResponse.replace(/\*\*/g, "");
  }

  return (
    `1. Konsep & Gaya Utama: (Ingin dibuat dengan gaya atau pendekatan seperti apa untuk "${topic}"?)\n` +
    `2. Elemen & Fitur Wajib: (Detail spesifik apa yang paling penting dan wajib dimasukkan?)\n` +
    `3. Standar Output Akhir: (Hasil akhirnya ingin difokuskan untuk platform atau format apa?)`
  );
}

// === OTAK AI 2: MERACIK MEGA-PROMPT SUPER DETAIL ===
async function generateMegaPromptWithAI(topic, specs) {
  const userMsg =
    `USER REQUESTED TOPIC: "${topic}"\n` +
    `USER DETAILED SPECIFICATIONS: "${specs}"\n\n` +
    `Now generate an ultra-detailed, comprehensive, maximum-quality Master Prompt in English using the required XML/HTML Prompt Engineering structure. Make it rich, specific, and exhaustive.`;

  const aiResponse = await callAIBrain(BRAIN_ENGINEER_PROMPT, userMsg, 22000);

  if (aiResponse && aiResponse.length > 150) {
    return aiResponse.replace(/```xml|```html|```/gi, "").trim();
  }

  // Fallback jika semua jaringan AI eksternal sedang penuh
  return (
`<system_role>
You are an Elite World-Class Principal Architect, Senior Director, and Master Specialist with 15+ years of deep domain expertise specifically tailored to execute: "${topic}".
</system_role>

<mission_objective>
Execute and deliver a complete, top 0.1% industry-standard masterpiece for the following request: "${topic}".
</mission_objective>

<comprehensive_specifications>
- Core User Specifications: ${specs}
- Depth & Precision: Expand every requirement into full production-ready/studio-grade execution with zero shortcuts.
- Structural Excellence: Apply modern industry frameworks, optimal technical/visual parameters, and high-impact composition.
- Realism & Polish: Ensure flawless coherence, micro-detail accuracy, and immediate usability.
</comprehensive_specifications>

<step_by_step_workflow>
1. Deeply analyze the core objective of "${topic}" and align with the specified parameters (${specs}).
2. Architect the complete structure, logic, or visual composition before generating the output.
3. Produce the full, unedited, exhaustive deliverable from start to finish.
4. Perform self-critique to ensure zero placeholders, zero artifacts, and maximum impact.
</step_by_step_workflow>

<strict_constraints>
- NEVER use placeholders, truncated examples, or generic surface-level filler.
- Deliver 100% complete, high-precision output ready for immediate deployment or use.
</strict_constraints>

<output_format_and_language>
Deliver all explanations, user interface text, or written content in natural, authoritative Bahasa Indonesia, while maintaining world-class international technical and creative standards.
</output_format_and_language>`
  );
}

// === MESIN PEMANGGIL LLM MULTI-JALUR (DENGAN HEADER BROWSER AGAR TIDAK DIBLOKIR) ===
async function callAIBrain(systemPrompt, userMessage, timeoutMs = 15000) {
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*"
  };

  // Jalur 0: Jika memakai Gemini API Key standar (AIza...)
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

  // Jalur 1: OpenAI Endpoint via Pollinations Cloud
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(AI_OPENAI_URL, {
      method: "POST",
      headers: headers,
      signal: ctrl.signal,
      body: JSON.stringify({
        model: "openai",
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
        if (content) return content.trim();
      } catch {
        if (raw && raw.length > 30) return raw.trim();
      }
    }
  } catch (e) {}

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
        model: "openai"
      })
    });
    clearTimeout(t);
    if (res.ok) {
      const raw = await res.text();
      if (raw && raw.length > 30) {
        try {
          const json = JSON.parse(raw);
          if (json.choices?.[0]?.message?.content) return json.choices[0].message.content.trim();
        } catch {
          return raw.trim();
        }
      }
    }
  } catch (e) {}

  // Jalur 3: Direct GET Endpoint
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const url = `${AI_ROOT_URL}${encodeURIComponent(userMessage)}?model=openai&system=${encodeURIComponent(systemPrompt)}`;
    const res = await fetch(url, { headers: headers, signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const raw = await res.text();
      if (raw && raw.length > 30) return raw.trim();
    }
  } catch (e) {}

  return null;
}

// === PENGIRIM HASIL MEGA-PROMPT (AMAN DARI BATAS 4096 KARAKTER TELEGRAM) ===
async function sendMegaPromptResult(chatId, topic, specs, rawPrompt) {
  // Potong teks mentah SEBELUM di-escape agar tag HTML </code></pre> tidak pernah rusak
  const trimmedPrompt = rawPrompt.length > 3200
    ? rawPrompt.slice(0, 3200) + "\n</output_format_and_language>"
    : rawPrompt;

  const trimmedTopic = topic.length > 150 ? topic.slice(0, 150) + "..." : topic;
  const trimmedSpecs = specs.length > 200 ? specs.slice(0, 200) + "..." : specs;

  const htmlMsg =
    `✅ <b>MEGA-PROMPT ENGINEER SIAP DIGUNAKAN!</b>\n` +
    `📌 <b>Topik:</b> ${escapeHtml(trimmedTopic)}\n` +
    `⚙️ <b>Spesifikasi:</b> ${escapeHtml(trimmedSpecs)}\n\n` +
    `👇 <i>Ketuk <b>Copy Code</b> di bawah, lalu tempelkan ke AI tujuanmu (ChatGPT, Gemini, Claude, Midjourney, Sora, dll):</i>\n\n` +
    `<pre><code>${escapeHtml(trimmedPrompt)}</code></pre>`;

  const buttons = {
    inline_keyboard: [
      [{ text: "🔄 Buat Prompt Baru Lainnya", callback_data: "NEW_TOPIC" }]
    ]
  };

  await sendTelegram(chatId, htmlMsg, buttons);
}

// === PENYIMPAN SESI MENGGUNAKAN ORIGIN WORKER ASLI ===
async function saveSession(chatId, dataObj, origin) {
  memoryStore.set(chatId, dataObj);
  try {
    const cache = caches.default;
    const req = new Request(`${origin}/__session/${chatId}`);
    const res = new Response(JSON.stringify(dataObj), {
      headers: { "Content-Type": "application/json", "Cache-Control": "max-age=3600" }
    });
    await cache.put(req, res);
  } catch (e) {}
}

async function loadSession(chatId, origin) {
  if (memoryStore.has(chatId)) return memoryStore.get(chatId);
  try {
    const cache = caches.default;
    const req = new Request(`${origin}/__session/${chatId}`);
    const res = await cache.match(req);
    if (res) return await res.json();
  } catch (e) {}
  return null;
}

async function deleteSession(chatId, origin) {
  memoryStore.delete(chatId);
  try {
    const cache = caches.default;
    const req = new Request(`${origin}/__session/${chatId}`);
    await cache.delete(req);
  } catch (e) {}
}

// === FUNGSI KIRIM PESAN KE TELEGRAM ===
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
  // Cadangan otomatis jika format HTML ditolak Telegram
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