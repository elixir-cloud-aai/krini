import axios from "axios";
import { getCookie, setCookie } from "cookies-next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (code === null || state === null) redirect("/auth/error?type=params");

    const authState = await getCookie("authState", { cookies });
    if (authState !== state) redirect("/auth/error?type=state");

    try {
        const baseUrl = `${process.env.LS_LOGIN_URL}/oidc/token`;
        const response = await axios.post(
            baseUrl,
            new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: process.env.OIDC_REDIRECT_URI ?? "",
                client_id: process.env.OIDC_CLIENT_ID ?? "",
                client_secret: process.env.OIDC_CLIENT_SECRET ?? "",
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                validateStatus: (status : number) => status === 200,
            },
        );

        if (response.status === 200) {
            setCookie("access_token", response.data.access_token, {
                cookies: cookies,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 12,
                path: "/",
            });
            setCookie("id_token", response.data.id_token, {
                cookies: cookies,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 12,
                path: "/",
            });
        }
    } catch (err) {
        console.log(err);
        redirect("/auth/error?type=internal");
    }

    redirect("/dashboard");
}
