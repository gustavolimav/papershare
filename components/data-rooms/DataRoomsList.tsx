"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useWorkspaces } from "@/lib/useWorkspaces";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { CreateDataRoomModal } from "@/components/data-rooms/CreateDataRoomModal";
import type { DataRoomListResponse } from "@/types/index";

const PER_PAGE = 50;

export function DataRoomsList() {
  const { activeWorkspace } = useWorkspaces();

  const { data, error, isLoading, mutate } = useSWR<DataRoomListResponse>(
    activeWorkspace
      ? `/api/v1/workspaces/${activeWorkspace.id}/data-rooms?page=1&per_page=${PER_PAGE}`
      : null,
    fetcher,
  );

  const canEdit = activeWorkspace?.role !== "viewer";

  return (
    <div className="space-y-4">
      {canEdit && activeWorkspace && (
        <div className="flex justify-end">
          <CreateDataRoomModal
            workspaceId={activeWorkspace.id}
            onCreated={() => mutate()}
          />
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-12 w-full" />
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível carregar as data rooms.
        </p>
      )}

      {data && data.data_rooms.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">
          Nenhuma data room criada ainda. Agrupe vários documentos em uma data
          room para compartilhá-los com um único link.
        </p>
      )}

      {data && data.data_rooms.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Documentos</TableHead>
                <TableHead>Criada em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data_rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/data-rooms/${room.id}`}
                      className="hover:underline"
                    >
                      {room.name}
                    </Link>
                  </TableCell>
                  <TableCell>{room.document_count}</TableCell>
                  <TableCell>
                    {new Date(room.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
