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
      const err = await res.json();
      throw new Error(err.error || 'Translation failed');
    }

    return await res.json();
  } catch (error) {
    console.error('Translation error:', error);
    // Return original questions as fallback so the student can at least take the test
    return questions;
  }
}
