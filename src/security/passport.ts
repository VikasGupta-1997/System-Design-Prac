import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import config from "../config";
import { User } from "../db/postgres/models/auth.model";
import { Account } from "../db/postgres/models/account.model";
import crypto from "crypto";

// 🔹 Helper: upsert user
async function upsertUser(email: string, username: string) {
  let user = await User.findOne({ where: { email } });
  if (!user) {
    user = await User.create({
      email,
      username,
      password_hash: crypto.randomBytes(16).toString("hex"),
      role: "user",
    } as any);
  }
  return user;
}

// ✅ Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: config.googleClientId,
      clientSecret: config.googleClientSecret,
      callbackURL: `${config.serverBaseUrl}/api/v1/auth/oauth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("No email found"));

        const username = profile.displayName || email.split("@")[0];
        const user = await upsertUser(email, username);

        // ✅ Save or update access + refresh tokens
        let account = await Account.findOne({
          where: { userId: user.id, provider: "google" },
        });

        if (!account) {
          account = await Account.create({
            userId: user.id,
            provider: "google",
            providerAccountId: profile.id,
            accessToken,
            refreshToken,
          });
        } else {
          await account.update({
            accessToken,
            refreshToken,
            providerAccountId: profile.id,
          });
        }

        return done(null, user);
      } catch (err) {
        done(err);
      }
    }
  )
);

// ✅ GitHub Strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: config.githubClientId,
      clientSecret: config.githubClientSecret,
      callbackURL: `${config.serverBaseUrl}/api/v1/auth/oauth/github/callback`,
      scope: ["user:email"],
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: import("passport-github2").Profile,
      done: (error: any, user?: any) => void
    ) => {
      try {
        const email = profile.emails?.[0]?.value ?? (profile.username ? `${profile.username}@github.com` : undefined);
        if (!email) return done(new Error("No email found"));

        const username = profile.username || email.split("@")[0];
        const user = await upsertUser(email, username);

        let account = await Account.findOne({
          where: { userId: user.id, provider: "github" },
        });

        if (!account) {
          account = await Account.create({
            userId: user.id,
            provider: "github",
            providerAccountId: profile.id,
            accessToken,
            refreshToken,
          });
        } else {
          await account.update({
            accessToken,
            refreshToken,
            providerAccountId: profile.id,
          });
        }

        return done(null, user);
      } catch (err) {
        done(err);
      }
    }
  )
);

export default passport;
