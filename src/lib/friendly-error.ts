// Turns a raw Supabase / network error into a short message a visitor
// or member can act on, in their language. Callers console.error() the
// raw error where they catch it, so it's still there for debugging.
//
// Used on public and member pages only — the admin pages keep showing
// the raw error on purpose, since that's who can do something about it.

type Translate = (mn: string, en: string, ja?: string, zh?: string, ko?: string) => string;

export function friendlyError(raw: string, t: Translate): string {
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(raw)) {
    return t(
      "Холбогдож чадсангүй. Интернэт холболтоо шалгаад дахин оролдоно уу.",
      "Couldn't connect. Check your internet connection and try again.",
      "接続できませんでした。インターネット接続を確認して、もう一度お試しください。",
      "無法連線。請檢查網路連線後再試一次。",
      "연결할 수 없습니다. 인터넷 연결을 확인한 후 다시 시도해 주세요."
    );
  }
  if (/password should be at least/i.test(raw)) {
    return t(
      "Нууц үг хэт богино байна. Дор хаяж 6 тэмдэгт оруулна уу.",
      "That password is too short — use at least 6 characters.",
      "パスワードが短すぎます。6文字以上にしてください。",
      "密碼太短,請至少使用 6 個字元。",
      "비밀번호가 너무 짧습니다. 6자 이상 입력해 주세요."
    );
  }
  if (/should be different from the old password/i.test(raw)) {
    return t(
      "Шинэ нууц үг хуучнаасаа өөр байх ёстой.",
      "The new password must be different from your current one.",
      "新しいパスワードは現在のものと異なる必要があります。",
      "新密碼必須與目前的密碼不同。",
      "새 비밀번호는 현재 비밀번호와 달라야 합니다."
    );
  }
  if (/weak|easy to guess|pwned/i.test(raw)) {
    return t(
      "Энэ нууц үг хэт амархан байна. Илүү найдвартай нууц үг сонгоно уу.",
      "That password is too easy to guess — please choose a stronger one.",
      "このパスワードは推測されやすいため、より強力なものを選んでください。",
      "此密碼太容易被猜到,請選擇更安全的密碼。",
      "추측하기 쉬운 비밀번호입니다. 더 안전한 비밀번호를 선택해 주세요."
    );
  }
  if (/exceeded the maximum allowed size|payload too large|entity too large/i.test(raw)) {
    return t(
      "Файл хэт том байна. Илүү жижиг файл сонгоно уу.",
      "That file is too large — please choose a smaller one.",
      "ファイルが大きすぎます。小さいファイルを選んでください。",
      "檔案太大,請選擇較小的檔案。",
      "파일이 너무 큽니다. 더 작은 파일을 선택해 주세요."
    );
  }
  return t(
    "Алдаа гарлаа. Дахин оролдоно уу. Асуудал үргэлжилбэл contact@rciu.org хаягаар холбогдоно уу.",
    "Something went wrong. Please try again — if it keeps happening, email contact@rciu.org.",
    "エラーが発生しました。もう一度お試しください。解決しない場合は contact@rciu.org までご連絡ください。",
    "發生錯誤,請再試一次。如果問題持續,請寄信至 contact@rciu.org。",
    "문제가 발생했습니다. 다시 시도해 주세요. 계속되면 contact@rciu.org로 연락해 주세요."
  );
}
