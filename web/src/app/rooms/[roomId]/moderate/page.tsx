import { ModeratorView } from "@/components/ModeratorView";

export default function ModerateRoomPage({ params }: { params: { roomId: string } }) {
  return <ModeratorView roomId={params.roomId} />;
}
