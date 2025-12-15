import prisma from '../../../prisma/client.js';
import { BlogPostStatus, BlogPostType } from '@prisma/client';

function calculateReadingTimeMinutes(content) {
  if (!content) return null;

  const text = String(content).replace(/<[^>]+>/g, ' '); // tira HTML simples
  const words = text
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);

  if (!words.length) return null;

  const wordsPerMinute = 200;
  return Math.max(1, Math.ceil(words.length / wordsPerMinute));
}

const VALID_STATUS = new Set(Object.values(BlogPostStatus));
const VALID_TYPES = new Set(Object.values(BlogPostType));

async function listPosts({
  status,
  type,
  search,
  skip = 0,
  take = 10,
  onlyPublished = false,
}) {
  const where = {
    deletedAt: null,
  };

  if (onlyPublished) {
    where.status = BlogPostStatus.PUBLISHED;
  } else if (status && VALID_STATUS.has(status)) {
    where.status = status;
  }

  if (type && VALID_TYPES.has(type)) {
    where.type = type;
  }

  // 🔥 Escopo 100% GLOBAL (sem companyId / establishmentId)

  if (search && String(search).trim()) {
    const term = String(search).trim();
    where.OR = [
      { title: { contains: term, mode: 'insensitive' } },
      { summary: { contains: term, mode: 'insensitive' } },
      { content: { contains: term, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      skip,
      take,
      orderBy: [
        { isFeatured: 'desc' },
        { publishedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        author: true,
        lastEditor: true,
      },
    }),
    prisma.blogPost.count({ where }),
  ]);

  return { items, total };
}

async function getById(id) {
  return prisma.blogPost.findFirst({
    where: { id, deletedAt: null },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      author: true,
      lastEditor: true,
    },
  });
}

async function getBySlug(slug) {
  const post = await prisma.blogPost.findFirst({
    where: {
      slug,
      status: BlogPostStatus.PUBLISHED,
      deletedAt: null,
    },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      author: true,
    },
  });

  if (!post) return null;

  // conta views (fire-and-forget, erro aqui não deve quebrar a resposta)
  prisma.blogPost
    .update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => {});

  return { ...post, viewCount: post.viewCount + 1 };
}

async function createPost(input, authorId) {
  const {
    categoryIds,
    tagIds,
    type,
    status,
    content,
    readingTimeMinutes,
    ...rest
  } = input;

  const finalType = VALID_TYPES.has(type) ? type : BlogPostType.ARTICLE;
  const finalStatus = VALID_STATUS.has(status)
    ? status
    : BlogPostStatus.DRAFT;

  const finalReadingTime =
    typeof readingTimeMinutes === 'number'
      ? readingTimeMinutes
      : calculateReadingTimeMinutes(content);

  return prisma.blogPost.create({
    data: {
      ...rest,
      content,
      type: finalType,
      status: finalStatus,
      authorId,
      lastEditorId: authorId,
      readingTimeMinutes: finalReadingTime,
      categories:
        Array.isArray(categoryIds) && categoryIds.length
          ? {
              create: categoryIds.map((categoryId) => ({ categoryId })),
            }
          : undefined,
      tags:
        Array.isArray(tagIds) && tagIds.length
          ? {
              create: tagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
    },
  });
}

async function updatePost(id, input, editorId) {
  const {
    categoryIds,
    tagIds,
    content,
    readingTimeMinutes,
    ...rest
  } = input;

  const data = {
    ...rest,
    lastEditorId: editorId,
  };

  if (typeof content !== 'undefined') {
    data.content = content;
    if (typeof readingTimeMinutes === 'number') {
      data.readingTimeMinutes = readingTimeMinutes;
    } else {
      data.readingTimeMinutes = calculateReadingTimeMinutes(content);
    }
  } else if (typeof readingTimeMinutes === 'number') {
    data.readingTimeMinutes = readingTimeMinutes;
  }

  const updated = await prisma.blogPost.update({
    where: { id },
    data,
  });

  if (Array.isArray(categoryIds) || Array.isArray(tagIds)) {
    await prisma.$transaction(async (tx) => {
      if (Array.isArray(categoryIds)) {
        await tx.blogPostCategory.deleteMany({ where: { postId: id } });
        if (categoryIds.length) {
          await tx.blogPostCategory.createMany({
            data: categoryIds.map((categoryId) => ({
              postId: id,
              categoryId,
            })),
          });
        }
      }

      if (Array.isArray(tagIds)) {
        await tx.blogPostTag.deleteMany({ where: { postId: id } });
        if (tagIds.length) {
          await tx.blogPostTag.createMany({
            data: tagIds.map((tagId) => ({
              postId: id,
              tagId,
            })),
          });
        }
      }
    });
  }

  return updated;
}

async function publishPost(id, editorId, date) {
  return prisma.blogPost.update({
    where: { id },
    data: {
      status: BlogPostStatus.PUBLISHED,
      publishedAt: date || new Date(),
      lastEditorId: editorId,
    },
  });
}

async function unpublishPost(id, editorId) {
  return prisma.blogPost.update({
    where: { id },
    data: {
      status: BlogPostStatus.DRAFT,
      publishedAt: null,
      lastEditorId: editorId,
    },
  });
}

async function softDeletePost(id, editorId) {
  return prisma.blogPost.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      lastEditorId: editorId,
    },
  });
}

export default {
  listPosts,
  getById,
  getBySlug,
  createPost,
  updatePost,
  publishPost,
  unpublishPost,
  softDeletePost,
};
