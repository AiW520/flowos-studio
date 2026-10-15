"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Filter,
  Heart,
  Layers3,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Upload,
  Workflow,
  X,
} from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/app-shell";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { copyText } from "@/lib/clipboard";
import { discoverItems, models, projects, workflows } from "@/lib/data";

const statusTabs = ["全部", "制作中", "待规划", "可继续", "已完成"];

export function ProjectsScreen() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("全部");
  const [showCreate, setShowCreate] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [kind, setKind] = useState("全部类型");
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const visible = useMemo(
    () =>
      projects
        .filter(
          (project) =>
            (status === "全部" || project.status === status) &&
            (kind === "全部类型" || project.kind === kind) &&
            project.name.toLowerCase().includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "name"
            ? a.name.localeCompare(b.name, "zh-CN")
            : projects.indexOf(a) - projects.indexOf(b),
        ),
    [query, status, kind, sort],
  );
  return (
    <AppShell>
      <main className="page">
        <PageHeader
          eyebrow="WORKSPACE LIBRARY"
          title="项目"
          description="从 Brief、资产和镜头状态继续工作。"
          actions={
            <button
              className="button primary"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={16} />
              新建项目
            </button>
          }
        />
        <div className="toolbar">
          <div className="search-field">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索项目"
            />
          </div>
          <button
            className={`button secondary ${showFilters ? "active-button" : ""}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={15} />
            筛选
          </button>
          <button
            className="button secondary"
            onClick={() => setSort(sort === "recent" ? "name" : "recent")}
          >
            {sort === "recent" ? "最近更新" : "按名称"}
            <ChevronDown size={14} />
          </button>
        </div>
        {showFilters && (
          <div className="inline-filter">
            <span>项目类型</span>
            {[
              "全部类型",
              ...Array.from(new Set(projects.map((project) => project.kind))),
            ].map((item) => (
              <button
                key={item}
                className={kind === item ? "active" : ""}
                onClick={() => setKind(item)}
              >
                {item}
              </button>
            ))}
            <button
              onClick={() => {
                setKind("全部类型");
                setStatus("全部");
                setQuery("");
              }}
            >
              重置
            </button>
          </div>
        )}
        <div className="tabs" role="tablist">
          {statusTabs.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={status === tab}
              onClick={() => setStatus(tab)}
              className={status === tab ? "active" : ""}
            >
              {tab}
              <span>
                {tab === "全部"
                  ? projects.length
                  : projects.filter((project) => project.status === tab).length}
              </span>
            </button>
          ))}
        </div>
        {visible.length ? (
          <div className="projects-grid">
            {visible.map((project) => (
              <Link
                key={project.id}
                href={`/project/${project.id}`}
                className="project-library-card"
              >
                <div className="media-box ratio-wide">
                  <Image
                    src={project.image}
                    alt=""
                    fill
                    sizes="(max-width: 760px) 100vw, 33vw"
                  />
                </div>
                <div className="project-library-body">
                  <div>
                    <h2>{project.name}</h2>
                    <span className={`status ${project.status}`}>
                      {project.status}
                    </span>
                  </div>
                  <p>
                    {project.kind} · {project.shots} 镜头 · 更新于{" "}
                    {project.updated}
                  </p>
                  <div className="metric-row">
                    <span>{project.duration}</span>
                    <span>{project.assets} 个资产</span>
                    <ArrowRight size={15} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="没有匹配的项目"
            text="调整关键词或切换项目状态。"
          />
        )}
        <NewProjectDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
        />
      </main>
    </AppShell>
  );
}

const discoverTabs = ["全部", "作品", "素材", "创作配方", "社区"];

export function DiscoverScreen() {
  const [tab, setTab] = useState("全部");
  const [selected, setSelected] = useState(discoverItems[0]);
  const [liked, setLiked] = useState<string[]>([]);
  const [filters, setFilters] = useState<string[]>([]);
  const [sort, setSort] = useState<"popular" | "title">("popular");
  const [following, setFollowing] = useState(false);
  const [notice, setNotice] = useState("");
  const visible = discoverItems
    .filter(
      (item) =>
        (tab === "全部" || item.category === tab) &&
        filters.every((filter) => item.tags.includes(filter)),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title, "zh-CN")
        : Number.parseFloat(b.likes) - Number.parseFloat(a.likes),
    );
  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2200);
  };
  return (
    <AppShell>
      <main className="page">
        <PageHeader
          eyebrow="DISCOVER"
          title="发现资源"
          description="探索作品、素材与创作配方，把灵感直接带进项目。"
          actions={
            <>
              <Link className="button secondary" href="/assets">
                <Upload size={15} />
                上传资源
              </Link>
              <Link className="button primary" href="/project/new-recipe">
                <Plus size={15} />
                创建配方
              </Link>
            </>
          }
        />
        <div className="tabs discover-tabs">
          {discoverTabs.map((item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="discover-layout">
          <aside className="filter-panel">
            <div className="section-heading">
              <h2>筛选</h2>
              <button onClick={() => setFilters([])}>重置</button>
            </div>
            {["资源类型", "风格", "应用场景"].map((group, groupIndex) => (
              <fieldset key={group}>
                <legend>{group}</legend>
                {(groupIndex === 0
                  ? ["图像", "视频", "音频", "提示词"]
                  : groupIndex === 1
                    ? ["写实", "电影感", "插画", "极简", "中国风"]
                    : ["人像", "产品", "场景", "品牌设计"]
                ).map((label, index) => (
                  <label key={label}>
                    <input
                      type="checkbox"
                      checked={filters.includes(label)}
                      onChange={() =>
                        setFilters((items) =>
                          items.includes(label)
                            ? items.filter((item) => item !== label)
                            : [...items, label],
                        )
                      }
                    />
                    {label}
                    <span>{12 - index * 2}.k</span>
                  </label>
                ))}
              </fieldset>
            ))}
          </aside>
          <section className="discover-gallery">
            <div className="gallery-head">
              <span>{visible.length * 2048 + 91} 个资源</span>
              <button
                className="button secondary"
                onClick={() =>
                  setSort(sort === "popular" ? "title" : "popular")
                }
              >
                <SlidersHorizontal size={15} />
                {sort === "popular" ? "热度排序" : "标题排序"}
              </button>
            </div>
            {visible.length ? (
              <div className="masonry-grid">
                {visible.map((item) => (
                  <article
                    key={item.id}
                    className={
                      selected.id === item.id
                        ? "discover-card selected"
                        : "discover-card"
                    }
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ")
                        setSelected(item);
                    }}
                  >
                    <button
                      className="heart-button"
                      aria-label="收藏"
                      onClick={(event) => {
                        event.stopPropagation();
                        setLiked((items) =>
                          items.includes(item.id)
                            ? items.filter((id) => id !== item.id)
                            : [...items, item.id],
                        );
                      }}
                    >
                      <Heart
                        size={16}
                        fill={liked.includes(item.id) ? "currentColor" : "none"}
                      />
                    </button>
                    <div className="media-box ratio-discover">
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        sizes="(max-width: 760px) 100vw, 32vw"
                      />
                    </div>
                    <h3>{item.title}</h3>
                    <p>
                      {item.author}
                      <span>
                        <Heart size={12} />
                        {item.likes}
                      </span>
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="没有符合条件的资源"
                text="减少筛选条件后再试。"
              />
            )}
          </section>
          <aside className="detail-panel">
            <div className="media-box ratio-wide">
              <Image src={selected.image} alt="" fill sizes="320px" />
            </div>
            <span className="eyebrow accent">{selected.category}</span>
            <h2>{selected.title}</h2>
            <p className="author-line">
              <span className="avatar">创</span>
              {selected.author}
              <button
                className={following ? "following" : ""}
                onClick={() => setFollowing(!following)}
              >
                {following ? "已关注" : "+ 关注"}
              </button>
            </p>
            <div className="engagement">
              <span>
                <Heart size={14} />
                {selected.likes}
              </span>
              <span>
                <Eye size={14} />
                24.1k
              </span>
            </div>
            <p className="detail-copy">
              温暖克制的光影与清晰的主体关系，适合品牌、人物和生活方式内容创作。
            </p>
            <div className="tag-row">
              <span>电影感</span>
              <span>自然光</span>
              <span>品牌视觉</span>
            </div>
            <Link href={`/project/from-discover?discover=${encodeURIComponent(selected.title)}`} className="button primary wide">
              <Play size={15} />在 FlowOS 中使用
            </Link>
            <div className="recipe-box">
              <div>
                <strong>创作配方</strong>
                <button
                  onClick={async () =>
                    notify(
                      (await copyText(
                        "Aperture Studio X · 16:9 · 自然写实 · 柔光",
                      ))
                        ? "创作配方已复制"
                        : "复制失败，请检查浏览器剪贴板权限",
                    )
                  }
                >
                  <Copy size={13} />
                  复制
                </button>
              </div>
              <dl>
                <dt>模型</dt>
                <dd>Aperture Studio X</dd>
                <dt>画幅</dt>
                <dd>16:9</dd>
                <dt>风格</dt>
                <dd>自然写实 · 柔光</dd>
              </dl>
            </div>
          </aside>
        </div>
        {notice && (
          <div className="toast">
            <Check size={15} />
            {notice}
          </div>
        )}
      </main>
    </AppShell>
  );
}

const modelTypes = ["全部", "图像", "视频", "文案", "音频"];

export function ModelsScreen() {
  const [type, setType] = useState("全部");
  const [query, setQuery] = useState("");
  const [compare, setCompare] = useState<string[]>([]);
  const [providerOpen, setProviderOpen] = useState(false);
  const [providerName, setProviderName] = useState("Tuzi OpenAI Compatible");
  const [providerUrl, setProviderUrl] = useState("https://api.tu-zi.com/v1");
  const [providerEnvName, setProviderEnvName] = useState("PROVIDER_API_KEY");
  const [providerApiKey, setProviderApiKey] = useState("");
  const [showProviderKey, setShowProviderKey] = useState(false);
  const [providerError, setProviderError] = useState("");
  const [customProvider, setCustomProvider] = useState<string | null>(null);
  const [catalogModels, setCatalogModels] = useState(models);
  const [modelName, setModelName] = useState("");
  const [modelDescription, setModelDescription] = useState("");
  const [modelType, setModelType] = useState("图像");
  const [modelError, setModelError] = useState("");
  const [managedModelId, setManagedModelId] = useState("");
  const [managedModelName, setManagedModelName] = useState("");
  const [managedModelDescription, setManagedModelDescription] = useState("");
  const [managedModelType, setManagedModelType] = useState("图像");
  const [manageModelOpen, setManageModelOpen] = useState(false);
  const [manageModelError, setManageModelError] = useState("");
  const [compareOpen, setCompareOpen] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/models", { cache: "no-store" })
      .then((response) =>
        response.ok
          ? response.json()
          : Promise.reject(new Error("模型目录加载失败")),
      )
      .then((payload: { models?: typeof models }) => {
        if (active && payload.models?.length) setCatalogModels(payload.models);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2200);
  };
  const providerItems = [
    ...(customProvider ? [[customProvider, true] as const] : []),
    ["OpenAI", true] as const,
    ["Anthropic", true] as const,
    ["Google", false] as const,
    ["Stability AI", true] as const,
    ["Runway", true] as const,
    ["Luma AI", false] as const,
  ];
  const validateProvider = () => {
    const name = providerName.trim();
    const url = providerUrl.trim();
    const key = providerApiKey.trim();
    if (!name || !url || !key) {
      setProviderError("请填写供应商名称、接口地址和 API Key。");
      return null;
    }
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol))
        throw new Error("invalid protocol");
    } catch {
      setProviderError("请输入有效的 HTTP 或 HTTPS 接口地址。");
      return null;
    }
    return { name, url, key };
  };
  const saveProvider = () => {
    const provider = validateProvider();
    if (!provider) return;
    setCustomProvider(provider.name);
    setProviderApiKey("");
    setProviderError("");
    setShowProviderKey(false);
    setProviderOpen(false);
    notify(`${provider.name} 已连接，模型目录同步完成`);
  };
  const allModels = catalogModels;
  const visible = allModels.filter(
    (model) =>
      (type === "全部" || model.type === type) &&
      `${model.name} ${model.vendor} ${model.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const saveModel = () => {
    const provider = validateProvider();
    if (!provider) return;
    const name = modelName.trim();
    const description = modelDescription.trim();
    if (!name || !description) {
      setModelError("请填写模型名称和模型介绍。");
      return;
    }
    if (catalogModels.some((model) => model.name === name)) {
      setModelError("模型名称已存在，请更换名称。");
      return;
    }
    setCustomProvider(provider.name);
    setCatalogModels((items) => [
      {
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name,
        vendor: provider.name,
        type: modelType as (typeof models)[number]["type"],
        description,
        quality: 90,
        latency: "待测",
        cost: "待定",
        license: "待配置",
        accent: "#16b8c8",
        enabled: true,
        featured: false,
        updatedAt: new Date().toISOString(),
      },
      ...items,
    ]);
    setModelName("");
    setModelDescription("");
    setModelType("图像");
    setModelError("");
    setProviderOpen(false);
    notify(`${name} 已加入模型广场`);
  };
  const openModelManager = (model: (typeof models)[number]) => {
    setManagedModelId(model.name);
    setManagedModelName(model.name);
    setManagedModelDescription(model.description);
    setManagedModelType(model.type);
    setManageModelError("");
    setManageModelOpen(true);
  };
  const saveManagedModel = () => {
    const name = managedModelName.trim();
    const description = managedModelDescription.trim();
    if (!name || !description) {
      setManageModelError("模型名称和模型介绍不能为空。");
      return;
    }
    if (
      catalogModels.some(
        (model) => model.name === name && model.name !== managedModelId,
      )
    ) {
      setManageModelError("模型名称已存在，请更换名称。");
      return;
    }
    setCatalogModels((items) =>
      items.map((model) =>
        model.name === managedModelId
          ? { ...model, name, description, type: managedModelType as (typeof models)[number]['type'] }
          : model,
      ),
    );
    setCompare((items) =>
      items.map((item) => (item === managedModelId ? name : item)),
    );
    setManageModelOpen(false);
    notify(`${name} 的模型信息已更新`);
  };
  return (
    <AppShell>
      <main className="page models-page">
        <PageHeader
          eyebrow="MODEL CATALOG"
          title="模型市场"
          description="汇聚全球优质 AI 模型，按能力、质量、时延和许可完成创作路由。"
          actions={
            <>
              <Link className="button secondary" href="/admin/models">
                管理员入口
              </Link>
              <button
                className="button primary"
                onClick={() => setProviderOpen(true)}
              >
                <Plus size={15} />
                接入新模型
              </button>
            </>
          }
        />
        <div className="tabs model-category-tabs">
          {modelTypes.map((item) => (
            <button
              className={type === item ? "active" : ""}
              key={item}
              onClick={() => setType(item)}
            >
              {item === "全部" ? "全部模型" : `${item}生成`}
            </button>
          ))}
        </div>
        <div className="models-reference-layout">
          <section className="models-main">
            <div className="toolbar">
              <div className="search-field">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索模型、能力或关键词"
                />
              </div>
              <button className="button secondary" onClick={() => setQuery("")}>
                全部能力
              </button>
              <button
                className="button secondary"
                onClick={() => setType("全部")}
              >
                全部提供方
              </button>
              <button
                className="button secondary"
                onClick={() => setQuery("安全")}
              >
                商用安全
              </button>
            </div>
            <div className="model-table model-card-grid">
              {visible.map((model) => (
                <article className="model-card" key={model.name}>
                  <div className="model-card-head">
                    <span className="model-name">
                      <i style={{ background: model.accent }}>
                        {model.name[0]}
                      </i>
                      <b>
                        {model.name}
                        <small>{model.vendor}</small>
                      </b>
                    </span>
                    <div className="model-card-actions">
                      <button
                        type="button"
                        onClick={() => openModelManager(model)}
                      >
                        管理
                      </button>
                      <label className="model-compare">
                        <input
                          aria-label={`对比 ${model.name}`}
                          type="checkbox"
                          checked={compare.includes(model.name)}
                          onChange={() =>
                            setCompare((items) =>
                              items.includes(model.name)
                                ? items.filter((name) => name !== model.name)
                                : [...items, model.name].slice(-3),
                            )
                          }
                        />
                        对比
                      </label>
                    </div>
                  </div>
                  <p className="model-description">{model.description}</p>
                  <div className="model-card-meta">
                    <span>
                      <em>{model.type}</em>
                    </span>
                    <span className="quality">
                      <b>{model.quality}</b>
                      <i>
                        <u style={{ width: `${model.quality}%` }} />
                      </i>
                    </span>
                    <span>{model.latency}</span>
                    <span>{model.cost}</span>
                    <span className="license">
                      <Check size={13} />
                      {model.license}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <aside className="models-side">
            <section>
              <div className="section-heading">
                <h2>模型提供方</h2>
                <button
                  onClick={() => {
                    setProviderError("");
                    setProviderOpen(true);
                  }}
                >
                  管理连接
                </button>
              </div>
              {providerItems.map(([name, connected]) => (
                <button
                  key={String(name)}
                  onClick={() =>
                    notify(
                      `${name} ${connected ? "连接正常" : "连接向导已打开"}`,
                    )
                  }
                >
                  <i>{String(name)[0]}</i>
                  <span>{name}</span>
                  <em className={connected ? "connected" : ""}>
                    {connected ? "已连接" : "连接"}
                  </em>
                </button>
              ))}
            </section>
            <section>
              <div className="section-heading">
                <h2>模型使用概览</h2>
                <span>近 30 天</span>
              </div>
              <div className="model-usage">
                <b>
                  1,842<small>模型调用次数</small>
                </b>
                <b>
                  ¥ 624.60<small>总消耗成本</small>
                </b>
              </div>
              <div className="usage-bars">
                {[28, 44, 35, 66, 52, 78, 41, 58, 72, 88, 63, 94, 76, 84].map(
                  (height, index) => (
                    <i key={index} style={{ height: `${height}%` }} />
                  ),
                )}
              </div>
            </section>
            <Link href="/discover" className="model-pick">
              <div className="media-box ratio-wide">
                <Image src="/media/interior.webp" alt="" fill sizes="280px" />
              </div>
              <strong>真实感场景生成合集</strong>
              <small>10 个高质量模型 · 室内 / 建筑 / 产品</small>
            </Link>
          </aside>
        </div>
        {compare.length > 0 && (
          <div className="compare-bar">
            <span>
              <Layers3 size={16} />
              已选择 {compare.length}/3 个模型
            </span>
            <div>
              {compare.map((name) => (
                <span key={name}>
                  {name}
                  <button
                    aria-label={`移除 ${name}`}
                    onClick={() =>
                      setCompare((items) =>
                        items.filter((item) => item !== name),
                      )
                    }
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <button
              className="button primary"
              onClick={() => setCompareOpen(true)}
            >
              开始对比
              <ArrowRight size={15} />
            </button>
          </div>
        )}
        {providerOpen && (
          <SimpleDialog
            title="接入模型供应商"
            onClose={() => {
              setProviderError("");
              setModelError("");
              setProviderOpen(false);
              setProviderApiKey("");
              setShowProviderKey(false);
            }}
          >
            <label className="field">
              <span>供应商名称</span>
              <input
                value={providerName}
                onChange={(event) => setProviderName(event.target.value)}
              />
            </label>
            <label className="field">
              <span>接口地址</span>
              <input
                value={providerUrl}
                onChange={(event) => setProviderUrl(event.target.value)}
                placeholder="https://api.example.com/v1"
                inputMode="url"
              />
            </label>
            <label className="field">
              <span>API Key 密钥</span>
              <span className="field-with-action">
                <input
                  type={showProviderKey ? "text" : "password"}
                  value={providerApiKey}
                  onChange={(event) => {
                    setProviderApiKey(event.target.value);
                    setProviderError("");
                  }}
                  placeholder="粘贴供应商 API Key"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="field-action"
                  aria-label={showProviderKey ? "隐藏 API Key" : "显示 API Key"}
                  onClick={() => setShowProviderKey(!showProviderKey)}
                >
                  {showProviderKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>
            <label className="field">
              <span>环境变量名称</span>
              <input
                value={providerEnvName}
                onChange={(event) => setProviderEnvName(event.target.value)}
              />
            </label>
            <hr className="dialog-divider" />
            <label className="field">
              <span>模型名称</span>
              <input
                value={modelName}
                onChange={(event) => {
                  setModelName(event.target.value);
                  setModelError("");
                }}
                placeholder="例如：Tuzi Image Pro"
              />
            </label>
            <label className="field">
              <span>模型介绍</span>
              <textarea
                rows={3}
                value={modelDescription}
                onChange={(event) => {
                  setModelDescription(event.target.value);
                  setModelError("");
                }}
                placeholder="介绍模型擅长的任务、风格和适用场景"
              />
            </label>
            <label className="field">
              <span>模型类型</span>
              <select
                value={modelType}
                onChange={(event) => setModelType(event.target.value)}
              >
                {modelTypes
                  .filter((item) => item !== "全部")
                  .map((item) => (
                    <option key={item}>{item}</option>
                  ))}
              </select>
            </label>
            {providerError && (
              <p className="form-error" role="alert">
                {providerError}
              </p>
            )}
            {modelError && (
              <p className="form-error" role="alert">
                {modelError}
              </p>
            )}
            <p className="dialog-note">
              API Key 仅用于当前连接请求，不会显示在页面或写入
              URL。保存后模型介绍会展示在模型广场卡片中。
            </p>
            <div className="dialog-actions">
              <button className="button secondary" onClick={saveProvider}>
                保存并同步
              </button>
              <button className="button primary" onClick={saveModel}>
                保存并添加模型
              </button>
            </div>
          </SimpleDialog>
        )}
        {manageModelOpen && (
          <SimpleDialog
            title="管理模型"
            onClose={() => setManageModelOpen(false)}
          >
            <label className="field">
              <span>模型名称</span>
              <input
                value={managedModelName}
                onChange={(event) => {
                  setManagedModelName(event.target.value);
                  setManageModelError("");
                }}
              />
            </label>
            <label className="field">
              <span>模型介绍</span>
              <textarea
                rows={4}
                value={managedModelDescription}
                onChange={(event) => {
                  setManagedModelDescription(event.target.value);
                  setManageModelError("");
                }}
                placeholder="介绍模型擅长的任务、风格和适用场景"
              />
            </label>
            <label className="field">
              <span>模型类型</span>
              <select
                value={managedModelType}
                onChange={(event) => setManagedModelType(event.target.value)}
              >
                {modelTypes
                  .filter((item) => item !== "全部")
                  .map((item) => (
                    <option key={item}>{item}</option>
                  ))}
              </select>
            </label>
            {manageModelError && (
              <p className="form-error" role="alert">
                {manageModelError}
              </p>
            )}
            <button className="button primary wide" onClick={saveManagedModel}>
              保存模型信息
            </button>
          </SimpleDialog>
        )}
        {compareOpen && (
          <SimpleDialog
            title="模型能力对比"
            onClose={() => setCompareOpen(false)}
            wide
          >
            <div className="comparison-grid">
              {compare.map((name) => {
                const model = allModels.find((item) => item.name === name);
                if (!model) return null;
                return (
                  <article key={name}>
                    <i style={{ background: model.accent }}>{name[0]}</i>
                    <h3>{name}</h3>
                    <p>{model.vendor}</p>
                    <dl>
                      <dt>能力</dt>
                      <dd>{model.type}</dd>
                      <dt>质量评分</dt>
                      <dd>{model.quality}/100</dd>
                      <dt>平均时延</dt>
                      <dd>{model.latency}</dd>
                      <dt>每次成本</dt>
                      <dd>{model.cost}</dd>
                      <dt>许可</dt>
                      <dd>{model.license}</dd>
                    </dl>
                    <button
                      className="button primary wide"
                      onClick={() => {
                        setCompareOpen(false);
                        notify(`${name} 已设为项目默认模型`);
                      }}
                    >
                      设为默认
                    </button>
                  </article>
                );
              })}
            </div>
          </SimpleDialog>
        )}
        {notice && (
          <div className="toast">
            <Check size={15} />
            {notice}
          </div>
        )}
      </main>
    </AppShell>
  );
}

const workflowTabs = ["全部", "视频", "图像", "角色", "分镜"];

export function WorkflowsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState("全部");
  const [selected, setSelected] = useState<(typeof workflows)[number]>(
    workflows[0],
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [draftName, setDraftName] = useState("我的工作流");
  const [customFlows, setCustomFlows] = useState<typeof workflows>([]);
  const allFlows = [...customFlows, ...workflows];
  const visible = allFlows.filter(
    (flow) => tab === "全部" || flow.category === tab,
  );
  const createWorkflow = (event: FormEvent) => {
    event.preventDefault();
    setCustomFlows((items) => [
      {
        id: `custom-${Date.now()}`,
        name: draftName.trim() || "我的工作流",
        category: "图像",
        description: "自定义的本地工作流，可继续进入项目编排节点。",
        steps: 1,
        success: "新建",
        image: "/media/interior.webp",
      },
      ...items,
    ]);
    setCreateOpen(false);
  };
  return (
    <AppShell>
      <main className="page workflows-page">
        <PageHeader
          eyebrow="WORKFLOW MARKET"
          title="工作流市场"
          description="精选 AI 工作流，开箱即用，让成熟方法直接加速创作。"
          actions={
            <button
              className="button primary"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={15} />
              创建工作流
            </button>
          }
        />
        <section className="workflow-feature">
          <div>
            <span className="eyebrow">FEATURED WORKFLOW</span>
            <h2>
              从灵感到作品
              <br />
              用工作流加速你的创作
            </h2>
            <p>精选 AI 工作流，开箱即用，激发更多可能。</p>
            <button
              className="button inverse"
              onClick={() => setSelected(workflows[0])}
            >
              探索最新工作流
              <ArrowRight size={15} />
            </button>
          </div>
          <div className="workflow-feature-image">
            <Image
              src="/media/mountain.webp"
              alt=""
              fill
              priority
              sizes="800px"
            />
          </div>
        </section>
        <div className="tabs">
          {workflowTabs.map((item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="workflows-reference-layout">
          <div className="workflow-grid">
            {visible.map((flow) => (
              <article
                key={flow.id}
                className={`workflow-card ${selected.id === flow.id ? "selected" : ""}`}
              >
                <div className="media-box ratio-wide">
                  <Image
                    src={flow.image}
                    alt=""
                    fill
                    sizes="(max-width: 760px) 100vw, 30vw"
                  />
                </div>
                <div>
                  <span className="eyebrow accent">
                    {flow.category} WORKFLOW
                  </span>
                  <h2>{flow.name}</h2>
                  <p>{flow.description}</p>
                  <div className="metric-row">
                    <span>
                      <Workflow size={13} />
                      {flow.steps} 个步骤
                    </span>
                    <span>
                      <BarChart3 size={13} />
                      {flow.success} 成功率
                    </span>
                  </div>
                  <div className="card-actions">
                    <button
                      className="button secondary"
                      onClick={() => setSelected(flow)}
                    >
                      查看详情
                    </button>
                    <button
                      className="button primary"
                      onClick={() => router.push(`/project/${flow.id}`)}
                    >
                      开始使用
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <aside className="workflow-detail">
            <button
              className="workflow-close"
              aria-label="收起工作流详情"
              onClick={() => setSelected(workflows[0])}
            >
              <X size={17} />
            </button>
            <div className="media-box ratio-wide">
              <Image src={selected.image} alt="" fill sizes="360px" />
            </div>
            <span className="eyebrow accent">热门 · {selected.category}</span>
            <h2>{selected.name}</h2>
            <p>{selected.description}</p>
            <div className="engagement">
              <span>🔥 12.4k</span>
              <span>♡ 298</span>
            </div>
            <div className="tag-row">
              <span>开箱即用</span>
              <span>创作者精选</span>
              <span>{selected.category}</span>
            </div>
            <h3>
              工作流步骤 <small>共 {selected.steps} 步</small>
            </h3>
            <div className="workflow-step-list">
              {[
                "输入提示词",
                "风格与参数设置",
                "AI 生成内容",
                "结果预览与调整",
                "导出与使用",
              ].map((step, index) => (
                <div key={step}>
                  <i>{index + 1}</i>
                  <span>
                    <strong>{step}</strong>
                    <small>
                      {index < 2
                        ? "准备创作信息与参考"
                        : "自动执行并允许人工调整"}
                    </small>
                  </span>
                </div>
              ))}
            </div>
            <button
              className="button primary wide"
              onClick={() => router.push(`/project/${selected.id}`)}
            >
              <Play size={15} />
              立即启动工作流
              <ArrowRight size={15} />
            </button>
            <div className="workflow-detail-actions">
              <button onClick={() => setSelected(selected)}>♡ 收藏</button>
              <button
                onClick={() =>
                  void navigator.share?.({
                    title: selected.name,
                    url: window.location.href,
                  })
                }
              >
                分享
              </button>
              <button onClick={() => setCreateOpen(true)}>创建副本</button>
            </div>
          </aside>
        </div>
        {createOpen && (
          <SimpleDialog title="创建工作流" onClose={() => setCreateOpen(false)}>
            <form onSubmit={createWorkflow}>
              <label className="field">
                <span>工作流名称</span>
                <input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                />
              </label>
              <label className="field">
                <span>起始方式</span>
                <select defaultValue="空白节点">
                  <option>空白节点</option>
                  <option>从现有工作流复制</option>
                  <option>从项目导入</option>
                </select>
              </label>
              <button className="button primary wide" type="submit">
                创建并加入资料库
              </button>
            </form>
          </SimpleDialog>
        )}
      </main>
    </AppShell>
  );
}

export function CreatorScreen() {
  const [period, setPeriod] = useState("近 30 天");
  const [published, setPublished] = useState(
    projects.slice(0, 4).map((project) => project.id),
  );
  const [publishOpen, setPublishOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [displayName, setDisplayName] = useState("林夏 · 晨光工作室");
  const [notice, setNotice] = useState("");
  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2200);
  };
  return (
    <AppShell>
      <main className="page creator-page">
        <PageHeader
          eyebrow="CREATOR CENTER"
          title="创作者中心"
          description="记录创作，放大影响，让好作品持续产生价值。"
          actions={
            <>
              <button
                className="button secondary"
                onClick={() => setProfileOpen(true)}
              >
                编辑资料
              </button>
              <button
                className="button primary"
                onClick={() => setPublishOpen(true)}
              >
                <Upload size={15} />
                发布新作品
              </button>
            </>
          }
        />
        <div className="creator-toolbar">
          <div className="segmented">
            {["近 7 天", "近 30 天", "今年"].map((item) => (
              <button
                className={period === item ? "active" : ""}
                onClick={() => setPeriod(item)}
                key={item}
              >
                {item}
              </button>
            ))}
          </div>
          <span>示例数据</span>
        </div>
        <section className="stats-grid">
          {[
            ["已发布作品", "128", "+12%"],
            ["被复用次数", "3.27万", "+24%"],
            ["授权收入", "¥ 18,640", "+8%"],
            ["粉丝", "1,860", "+16%"],
          ].map(([label, value, change], index) => (
            <article key={label}>
              <span className={`stat-icon s${index}`}>
                <BarChart3 size={18} />
              </span>
              <small>{label}</small>
              <strong>{value}</strong>
              <em>{change} 较上期</em>
            </article>
          ))}
        </section>
        <div className="creator-reference-layout">
          <section className="creator-works">
            <div className="section-heading">
              <div>
                <h2>
                  已发布作品 <span>{projects.length}</span>
                </h2>
                <p>图片、视频、模板和合集集中管理</p>
              </div>
              <button onClick={() => setManageOpen(true)}>
                管理全部
                <ArrowRight size={13} />
              </button>
            </div>
            <div className="tabs">
              {["全部", "图片", "视频", "音乐", "提示词", "模板", "合集"].map(
                (item, index) => (
                  <button
                    key={item}
                    className={index === 0 ? "active" : ""}
                    onClick={() => notify(`已切换到${item}作品`)}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>
            <div className="creator-work-grid">
              {projects.map((project) => (
                <article key={project.id}>
                  <Link
                    href={`/project/${project.id}`}
                    className="media-box ratio-wide"
                  >
                    <Image
                      src={project.image}
                      alt=""
                      fill
                      sizes="(max-width: 760px) 50vw, 20vw"
                    />
                  </Link>
                  <div>
                    <strong>{project.name}</strong>
                    <button
                      aria-label={`管理 ${project.name}`}
                      onClick={() => setManageOpen(true)}
                    >
                      •••
                    </button>
                  </div>
                  <p>
                    <span>
                      <Eye size={12} />
                      {(project.shots * 2.1).toFixed(1)}k
                    </span>
                    <span>↻ {project.assets * 42}</span>
                    <span>¥ {project.shots * 320}</span>
                  </p>
                </article>
              ))}
            </div>
          </section>
          <aside className="creator-data-side">
            <section className="analytics-panel">
              <div className="section-heading">
                <div>
                  <h2>数据概览</h2>
                  <p>{period} · 浏览与复用趋势</p>
                </div>
                <button onClick={() => setAnalyticsOpen(true)}>
                  查看详情
                  <ArrowRight size={13} />
                </button>
              </div>
              <div className="chart" aria-label="作品表现趋势图">
                <svg viewBox="0 0 700 220" role="img">
                  <polyline
                    points="0,190 90,165 180,172 270,110 360,130 450,72 540,92 630,35 700,48"
                    fill="none"
                    stroke="#14b8c8"
                    strokeWidth="4"
                  />
                  <polyline
                    points="0,205 90,194 180,181 270,175 360,150 450,155 540,120 630,108 700,88"
                    fill="none"
                    stroke="#ff7063"
                    strokeWidth="3"
                  />
                </svg>
                <div className="chart-legend">
                  <span>
                    <i className="cyan" />
                    浏览
                  </span>
                  <span>
                    <i className="coral" />
                    复用
                  </span>
                </div>
              </div>
            </section>
            <section className="version-history">
              <div className="section-heading">
                <h2>版本历史</h2>
                <Link href="/asset/coast">
                  查看全部
                  <ArrowRight size={13} />
                </Link>
              </div>
              {[
                ["v1.3", "优化构图与色彩，提升细节表现"],
                ["v1.2", "调整光影与整体氛围"],
                ["v1.1", "修复局部瑕疵"],
                ["v1.0", "初始版本"],
              ].map(([version, detail], index) => (
                <div key={version}>
                  <i className={index === 0 ? "current" : ""} />
                  <span>
                    <strong>{version}</strong>
                    <small>{detail}</small>
                  </span>
                  <em>林夏</em>
                </div>
              ))}
            </section>
            <section className="license-panel">
              <div className="section-heading">
                <h2>使用场景与受众</h2>
                <Link href="/analytics">详情</Link>
              </div>
              {[
                ["社媒内容", "38", "38%"],
                ["商业设计", "27", "27%"],
                ["个人创作", "20", "20%"],
                ["教育学习", "10", "10%"],
              ].map(([label, count, width]) => (
                <div className="license-row" key={label}>
                  <span>
                    <strong>{label}</strong>
                    <small>{count}%</small>
                  </span>
                  <b>{width}</b>
                  <i>
                    <u style={{ width }} />
                  </i>
                </div>
              ))}
            </section>
          </aside>
        </div>
        <section className="creator-license-settings">
          <div className="section-heading">
            <h2>版权与授权设置</h2>
            <button onClick={() => notify("授权设置已保存")}>保存</button>
          </div>
          <div>
            <span className="mini-thumb large">
              <Image src={projects[0].image} alt="" fill sizes="64px" />
            </span>
            <label>
              版权类型
              <select>
                <option>标准版权（保留署名）</option>
                <option>完全版权</option>
              </select>
            </label>
            <label>
              授权范围
              <select>
                <option>个人及商业使用</option>
                <option>仅个人使用</option>
              </select>
            </label>
            <label>
              价格设置
              <input defaultValue="49" />
            </label>
            <label className="switch">
              <span>允许二次创作</span>
              <input
                type="checkbox"
                checked={published.includes(projects[0].id)}
                onChange={() =>
                  setPublished((items) =>
                    items.includes(projects[0].id)
                      ? items.filter((id) => id !== projects[0].id)
                      : [...items, projects[0].id],
                  )
                }
              />
              <i />
            </label>
          </div>
        </section>
        {publishOpen && (
          <SimpleDialog
            title="发布新作品"
            onClose={() => setPublishOpen(false)}
          >
            <label className="field">
              <span>选择项目</span>
              <select defaultValue={projects[0].id}>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>公开许可</span>
              <select defaultValue="商用许可">
                <option>商用许可</option>
                <option>署名许可</option>
                <option>仅展示</option>
              </select>
            </label>
            <button
              className="button primary wide"
              onClick={() => {
                setPublishOpen(false);
                notify("仅预览发布流程，作品未公开发布");
              }}
            >
              确认发布
            </button>
          </SimpleDialog>
        )}
        {profileOpen && (
          <SimpleDialog
            title="编辑创作者资料"
            onClose={() => setProfileOpen(false)}
          >
            <label className="field">
              <span>显示名称</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
            <label className="field">
              <span>个人简介</span>
              <textarea rows={3} defaultValue="视觉创作者 / 品牌内容导演" />
            </label>
            <button
              className="button primary wide"
              onClick={() => {
                setProfileOpen(false);
                notify("创作者资料已保存");
              }}
            >
              保存资料
            </button>
          </SimpleDialog>
        )}
        {analyticsOpen && (
          <SimpleDialog
            title="作品表现详情"
            onClose={() => setAnalyticsOpen(false)}
            wide
          >
            <div className="analytics-table">
              <div>
                <strong>指标</strong>
                <strong>本期</strong>
                <strong>上期</strong>
                <strong>变化</strong>
              </div>
              {[
                ["作品浏览", "38,420", "32,140", "+19.5%"],
                ["配方复用", "3,270", "2,640", "+23.9%"],
                ["项目收藏", "1,082", "940", "+15.1%"],
                ["授权收入", "¥18,640", "¥17,260", "+8.0%"],
              ].map((row) => (
                <div key={row[0]}>
                  {row.map((value) => (
                    <span key={value}>{value}</span>
                  ))}
                </div>
              ))}
            </div>
          </SimpleDialog>
        )}
        {manageOpen && (
          <SimpleDialog
            title="发布管理"
            onClose={() => setManageOpen(false)}
            wide
          >
            <div className="manage-list">
              {projects.map((project) => (
                <label key={project.id}>
                  <span className="mini-thumb">
                    <Image src={project.image} alt="" fill sizes="48px" />
                  </span>
                  <span>
                    <strong>{project.name}</strong>
                    <small>{project.kind}</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={published.includes(project.id)}
                    onChange={() =>
                      setPublished((items) =>
                        items.includes(project.id)
                          ? items.filter((id) => id !== project.id)
                          : [...items, project.id],
                      )
                    }
                  />
                </label>
              ))}
            </div>
          </SimpleDialog>
        )}
        {notice && (
          <div className="toast">
            <Check size={15} />
            {notice}
          </div>
        )}
      </main>
    </AppShell>
  );
}

function SimpleDialog({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const compact = title === "接入模型供应商";
  return (
    <div
      className="dialog-layer"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div
        className={`dialog simple-dialog ${wide ? "dialog-wide" : ""} ${compact ? "dialog-compact" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="simple-dialog-title"
      >
        <div className="dialog-header">
          <h2 id="simple-dialog-title">{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
      </div>
    </div>
  );
}
