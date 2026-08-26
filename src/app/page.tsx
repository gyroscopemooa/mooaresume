import { LaunchPriceBanner } from "@/components/launch-price-banner";
import HomePageContent from "./home-page-content";
import "./home-mobile-header.module.css";
import "./home-startup-header.module.css";

export { metadata } from "./home-page-content";

export default function HomePage(): React.ReactNode {
  return <><LaunchPriceBanner /><HomePageContent /></>;
}
