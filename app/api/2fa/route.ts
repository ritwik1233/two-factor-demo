import speakeasy from "speakeasy";
import QRCode from "qrcode";
import dbConnect from "../../lib/mongoose";
import User from "../../models/User";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/lib/auth";
import { getServerSession } from "next-auth";

export async function GET() {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();

    const user: any = await User.findOne({
      _id: session?.user?.id,
    }).lean();
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    // Generate a 2FA secret
    const secret = speakeasy.generateSecret({
      name: `${process.env.APP_NAME}`,
    });
    await User.updateOne(
      {
        _id: user._id,
      },
      {
        $set: {
          tempTwoFactorSecret: secret.base32,
        },
      }
    );
    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url || "");
    return NextResponse.json({ qrCodeDataURL }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    const session: any = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const user: any = await User.findOne({ _id: session.user.id }).lean();
    if (!user || !user.tempTwoFactorSecret) {
      return NextResponse.json(
        { message: "2FA setup not initiated" },
        { status: 400 }
      );
    }
    const isVerified = speakeasy.totp.verify({
      secret: user.tempTwoFactorSecret,
      encoding: "base32",
      token,
    });
    if (isVerified) {
      await User.updateOne(
        {
          _id: user._id,
        },

        {
          $set: {
            twoFactorSecret: user.tempTwoFactorSecret,
            twoFactorEnabled: true,
          },
          $unset: {
            tempTwoFactorSecret: "",
          },
        }
      );

      return NextResponse.json(
        { message: "2FA enabled successfully" },
        { status: 200 }
      );
    } else {
      return NextResponse.json({ message: "Invalid token" }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to enable 2FA" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    await User.updateOne(
      {
        _id: session.user.id,
      },
      {
        $unset: { twoFactorSecret: "", twoFactorEnabled: "" },
      }
    );
    return NextResponse.json(
      { message: "2FA disabled successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to disable 2FA" },
      { status: 500 }
    );
  }
}
