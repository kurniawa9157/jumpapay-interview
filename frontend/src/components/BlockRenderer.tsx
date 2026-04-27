import type { BuilderComponent } from "../types/builder.types";
import { NavbarBlock } from "./blocks/NavbarBlock";
import { SliderBlock } from "./blocks/SliderBlock";
import { HtmlBlock } from "./blocks/HtmlBlock";
import { CardGridBlock } from "./blocks/CardGridBlock";
import { ImageBlock } from "./blocks/ImageBlock";
import { ArticleGridBlock } from "./blocks/ArticleGridBlock";
import { FooterBlock } from "./blocks/FooterBlock";

interface Props {
  layout: BuilderComponent[];
}

// BlockRenderer — dispatcher yang map block.type → component sesuai.
// Dipakai di public landing dan canvas preview di builder.
export function BlockRenderer({ layout }: Props) {
  return (
    <>
      {layout.map((comp) => {
        const p = comp.props || {};
        const key = comp.id;
        switch (comp.type) {
          case "navbar":
            return <NavbarBlock key={key} props={p} />;
          case "slider":
            return <SliderBlock key={key} props={p} />;
          case "html_block":
            return <HtmlBlock key={key} props={p} />;
          case "card_grid":
            return <CardGridBlock key={key} props={p} />;
          case "image_block":
            return <ImageBlock key={key} props={p} />;
          case "article_grid":
            return <ArticleGridBlock key={key} props={p} />;
          case "footer":
            return <FooterBlock key={key} props={p} />;
          default:
            return null;
        }
      })}
    </>
  );
}
