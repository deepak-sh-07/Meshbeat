/*
  Warnings:

  - Added the required column `name` to the `room` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."room" ADD COLUMN     "name" TEXT NOT NULL;
