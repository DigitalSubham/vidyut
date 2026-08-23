import type { Request, Response } from "express";
import type {
  CreateHostelBlockInput,
  CreateRoomAllocationInput,
  CreateRoomInput,
  ListHostelAttendanceQueryInput,
  ListHostelBlocksQueryInput,
  ListRoomAllocationsQueryInput,
  ListRoomsQueryInput,
  MarkHostelAttendanceInput,
} from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function createHostelBlock(req: Request, res: Response): Promise<void> {
  const block = await service.createHostelBlock(req.auth!, req.body as CreateHostelBlockInput);
  created(res, block);
}

export async function listHostelBlocks(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListHostelBlocksQueryInput;
  const blocks = await service.listHostelBlocks(req.auth!, query.branchId);
  ok(res, blocks);
}

export async function createRoom(req: Request, res: Response): Promise<void> {
  const room = await service.createRoom(req.auth!, req.params.id!, req.body as CreateRoomInput);
  created(res, room);
}

export async function listRooms(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListRoomsQueryInput;
  const rooms = await service.listRooms(req.auth!, query.blockId);
  ok(res, rooms);
}

export async function createRoomAllocation(req: Request, res: Response): Promise<void> {
  const allocation = await service.createRoomAllocation(req.auth!, req.body as CreateRoomAllocationInput);
  created(res, allocation);
}

export async function listRoomAllocations(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListRoomAllocationsQueryInput;
  const allocations = await service.listRoomAllocations(req.auth!, query.roomId, query.studentId);
  ok(res, allocations);
}

export async function markHostelAttendance(req: Request, res: Response): Promise<void> {
  const records = await service.markHostelAttendance(req.auth!, req.body as MarkHostelAttendanceInput);
  ok(res, records);
}

export async function listHostelAttendance(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListHostelAttendanceQueryInput;
  const records = await service.listHostelAttendance(req.auth!, query.branchId, query.date);
  ok(res, records);
}
