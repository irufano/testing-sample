import { request } from "./client";
import type { Member, MemberInput, MemberStatus, PaginatedData } from "./types";

export interface ListMembersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: MemberStatus | "";
}

export function listMembers(params: ListMembersParams = {}): Promise<PaginatedData<Member>> {
  return request<PaginatedData<Member>>("/members", { params });
}

export function getMember(id: number): Promise<Member> {
  return request<Member>(`/members/${id}`);
}

export function createMember(input: MemberInput): Promise<Member> {
  return request<Member>("/members", { method: "POST", body: input });
}

export function updateMember(id: number, input: Partial<MemberInput>): Promise<Member> {
  return request<Member>(`/members/${id}`, { method: "PUT", body: input });
}

export function deleteMember(id: number): Promise<null> {
  return request<null>(`/members/${id}`, { method: "DELETE" });
}
