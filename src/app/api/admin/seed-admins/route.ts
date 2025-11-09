import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, userStats } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";

export async function POST() {
  try {
    const admins = [
      { email: "topwriteessays@gmail.com", name: "Admin User 1" },
      { email: "m.d.techpoint25@gmail.com", name: "Admin User 2" },
      { email: "maguna956@gmail.com", name: "Admin User 3" },
      { email: "tasklynk01@gmail.com", name: "Admin User 4" },
      { email: "maxwellotieno11@gmail.com", name: "Admin User 5" },
      { email: "ashleydothy3162@gmail.com", name: "Admin User 6" },
    ];

    const passwordHash = await bcrypt.hash("kemoda2025", 10);
    const now = new Date().toISOString();

    // Find which already exist
    const existing = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(inArray(users.email, admins.map((a) => a.email)));

    const existingEmails = new Set(existing.map((u) => u.email));

    const toCreate = admins
      .map((a, i) => ({
        displayId: `ADMN#${String(i + 1).padStart(4, "0")}`,
        email: a.email,
        password: passwordHash,
        name: a.name,
        role: "admin" as const,
        approved: true,
        // Keep only minimal required columns to avoid driver issues
        phone: "+2547000000" + String(i + 1),
        status: "active",
        createdAt: now,
        updatedAt: now,
      }))
      .filter((u) => !existingEmails.has(u.email));

    const created: { id: number; email: string }[] = [];

    // Insert one-by-one to avoid multi-row RETURNING limitations
    for (const u of toCreate) {
      try {
        const res = await db
          .insert(users)
          .values(u)
          .returning({ id: users.id, email: users.email });
        if (res && res[0]) {
          created.push(res[0]);
          continue;
        }
      } catch (_err) {
        // Fallback path: insert without returning then select
        try {
          await db.insert(users).values(u);
        } catch (e2) {
          // If unique constraint hit concurrently, we'll select next
        }
      }

      // Fallback select by email
      const sel = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.email, u.email))
        .limit(1);
      if (sel[0]) created.push(sel[0]);
    }

    // Ensure any pre-existing admins are approved and role-correct
    if (existing.length) {
      for (const u of existing) {
        await db
          .update(users)
          .set({ role: "admin", approved: true, updatedAt: now })
          .where(eq(users.id, u.id));
      }
    }

    // Create userStats for newly created admins (skip if exists)
    if (created.length) {
      for (const c of created) {
        try {
          await db.insert(userStats).values({
            userId: c.id,
            totalJobsPosted: 0,
            totalJobsCompleted: 0,
            totalJobsCancelled: 0,
            totalAmountEarned: 0,
            totalAmountSpent: 0,
            averageRating: null,
            totalRatings: 0,
            onTimeDelivery: 0,
            lateDelivery: 0,
            revisionsRequested: 0,
            createdAt: now,
            updatedAt: now,
          });
        } catch (_e) {
          // ignore if already exists
        }
      }
    }

    return NextResponse.json({
      ok: true,
      created: created.length,
      skipped: existingEmails.size,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
}