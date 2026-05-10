export async function translateQuestions(questions: any[], targetLang: string, user: any): Promise<any[]> {
  if (targetLang === 'English' || !targetLang) return questions;
  if (!questions || questions.length === 0) return [];
  
  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ questions, targetLang })
    });

    if (!res.ok) {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const err = await res.json();
        throw new Error(err.error || 'Translation failed');
      } else {
        throw new Error(`Translation server error (${res.status})`);
      }
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Invalid translation response");
    }

    return await res.json();
  } catch (error) {
    console.error('Translation error:', error);
    // Return original questions as fallback so the student can at least take the test
    return questions;
  }
}
