import { NextResponse } from "next/server";

export async function GET(request, response) {
  try {
    const scope = ["identify", "email"].join(" ");
    const params = await request.nextUrl.searchParams;
    const code = params.get("code");

    const body = new URLSearchParams({
      client_id: process.env.DISCORD_APP_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      redirect_uri: process.env.DISCORD_REDIRECT_URI,
      code: code,
      scope: scope,
    }).toString();
    const tokenData = await fetch("https://discord.com/api/oauth2/token", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
      body,
    }).then((res) => res.json());
    console.log("token Data", tokenData)
    if(tokenData.error){
      return NextResponse.json({ error: "Internal Server Error" })
    }

    const userData = await fetch("https://discord.com/api/users/@me", {
      headers: {
        authorization: `${tokenData.token_type} ${tokenData.access_token}`,
      },
      method: "GET",
    }).then((res) => res.json());
    console.log("user Data", userData)

    if(userData?.message){
      return NextResponse.json({ error: "Internal Server Error" })
    }
    return NextResponse.json({ userData });
  } catch (err) {
    console.error("Discord Sign-In Error:", err.message);
    return NextResponse.json({ error: "Internal Server Error" });
  }
}

export const dynamic = "force-dynamic";
