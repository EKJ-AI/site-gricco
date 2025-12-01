import React, { useEffect } from "react";
import "../styles/BlogSection.css";
import articleImg1 from "../../../shared/assets/images/home/participa_brasil.png";
import articleImg2 from"../../../shared/assets/images/home/training.png";
import articleImg3 from"../../../shared/assets/images/home/nr.png"
import { useTranslation } from "../../../shared/i18n";
import { Link } from "react-router-dom";

const BlogSection = () => {
    const { t } = useTranslation();
    const articles = [
      {
        id: 1,
        title: t('article1.title'),
        summary: t('article1.subtitle'),
        image: articleImg1,
        link: "#",
      },
      {
        id: 2,
        title: t('article2.title'),
        summary: t('article2.subtitle'),
        image: articleImg2,
        link: "#",
      },
      {
        id: 3,
        title: t('article3.title'),
        summary: t('article3.subtitle'),
        image: articleImg3,
        link: "#",
      },
    ];
  return (
    <section id="blog">
      <div>
        <h2>{t("blog.section.title")}</h2>
        <br />
        <div className="blog-grid">
          {articles.map((post) => (
            <div key={post.id} className="blog-card">
              <img src={post.image} alt={post.title} className="blog-image" />
              <div className="blog-content">
                <h3>{post.title}</h3>
                <p>{post.summary}</p>
                <Link to={`/blog/${post.id}`} className="blog-btn">
                {t("articles.button.text")}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
