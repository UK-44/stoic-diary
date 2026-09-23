import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 認証不要のパス（ここ以外は未ログインだと /login へ飛ばす）。
const PUBLIC_PATHS = ["/login", "/auth"];

/** セッションを更新しつつ、未認証アクセスを /login にリダイレクトする。 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getClaims() でもトークンは必要に応じて更新される（内部で getSession を呼ぶため・重要）。
  // 署名鍵が非対称（ES256）なので JWKS による署名検証はローカルで完結し、getUser() と違って
  // 毎リクエスト（ページ遷移・自動保存の Server Action 含む）の Supabase Auth 往復が発生しない。
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub ? data.claims : null;

  const isPublic = PUBLIC_PATHS.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );

  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
