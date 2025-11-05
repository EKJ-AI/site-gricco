import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "../../../shared/i18n";
import "../styles/BlogPost.css"
import articleImg1 from "../../../shared/assets/images/home/participa_brasil.png";
import articleImg2 from "../../../shared/assets/images/home/training.png";
import articleImg3 from "../../../shared/assets/images/home/nr.png";

const BlogPost = () => {
  const { t } = useTranslation();
  const { id } = useParams();

  const articles = [
    {
      id: "1",
      title: t("article1_title"),
      image: articleImg1,
      content: t("article1_fulltext"),
      date: "15 de Julho, 2025",
      author: "Equipe Gricco",
      initialLikes: 10,
    },
    {
      id: "2",
      title: t("article2_title"),
      image: articleImg2,
      content: t("article2_fulltext"),
      date: "10 de Junho, 2025",
      author: "Equipe Gricco",
      initialLikes: 7,
    },
    {
      id: "3",
      title: t("article3_title"),
      image: articleImg3,
      content: t("article3_fulltext"),
      date: "01 de Maio, 2025",
      author: "Equipe Gricco",
      initialLikes: 3,
    },
  ];

  const article = articles.find((a) => a.id === id);

  // Estado para curtir
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(article ? article.initialLikes : 0);

  if (!article) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Artigo não encontrado.</div>;
  }

  const toggleLike = () => {
    if (liked) {
      setLikesCount(likesCount - 1);
    } else {
      setLikesCount(likesCount + 1);
    }
    setLiked(!liked);
  };

  return (
    <article className="blog-post-container">
      <img src={article.image} alt={article.title} />
      <h1>{article.title}</h1>
      <div className="blog-post-meta">
        {article.date} &nbsp;|&nbsp; {article.author}
      </div>
        <div className="article-content"
        dangerouslySetInnerHTML={{
            __html: article.content.replace(/\n\n/g, '<br/><br/>'),
        }}
        />

      <button 
        className={`like-button ${liked ? "liked" : ""}`} 
        onClick={toggleLike}
        aria-pressed={liked}
      >
        {liked ? "❤️ Curtido" : "🤍 Curtir"}
      </button>
      <div className="like-count">{likesCount} {likesCount === 1 ? "curtida" : "curtidas"}</div>
    </article>
  );
};

export default BlogPost;

