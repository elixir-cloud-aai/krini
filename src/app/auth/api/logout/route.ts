import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const response = NextResponse.redirect(new URL("/auth/login", req.url));

    response.cookies.delete("access_token");
    response.cookies.delete("id_token");

    return response;
}
