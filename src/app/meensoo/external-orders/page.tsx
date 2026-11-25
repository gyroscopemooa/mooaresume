import { ExternalOrderConsole } from "./external-order-console";
import { externalOrdersEnabled } from "@/server/external-orders/service";
export const dynamic="force-dynamic";
export default function ExternalOrdersPage(){return <ExternalOrderConsole enabled={externalOrdersEnabled()}/>;}
