"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Boxes,
  Check,
  CloudCog,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import type { ModelCatalogItem } from "@/lib/data";
import type {
  ModelInput,
  ModelProvider,
  ProviderInput,
  RegistryPayload,
} from "@/lib/model-registry-types";

const emptyModel: ModelInput = {
  name: "",
  vendor: "",
  type: "图像",
  description: "",
  quality: 90,
  latency: "30s",
  cost: "20 cr",
  license: "商用安全",
  accent: "#16b8c8",
  enabled: true,
  featured: false,
};

const emptyProvider: ProviderInput = {
  name: "Tuzi Coding API",
  baseUrl: "https://api.tu-zi.com/coding",
  apiKey: "",
  status: "connected",
};

async function readJson<T>(response: Response): Promise<T> {
  if (response.status === 204) return {} as T;
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "请求处理失败。");
  return payload;
}

export function AdminModelsScreen() {
  const [registry, setRegistry] = useState<RegistryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "enabled" | "disabled">("all");
  const [modelForm, setModelForm] = useState<ModelInput>(emptyModel);
  const [editingModel, setEditingModel] = useState<ModelCatalogItem | null>(
    null,
  );
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [providerForm, setProviderForm] =
    useState<ProviderInput>(emptyProvider);
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRegistry = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/admin/api/registry", {
        cache: "no-store",
      });
      setRegistry(await readJson<RegistryPayload>(response));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "管理数据加载失败。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void loadRegistry());
    return () => window.cancelAnimationFrame(frame);
  }, [loadRegistry]);

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  };

  const models = useMemo(
    () =>
      (registry?.models ?? []).filter((model) => {
        const matchesStatus =
          status === "all" ||
          (status === "enabled" ? model.enabled : !model.enabled);
        const searchable =
          `${model.name} ${model.vendor} ${model.type} ${model.description}`.toLowerCase();
        return matchesStatus && searchable.includes(query.trim().toLowerCase());
      }),
    [query, registry, status],
  );

  const stats = useMemo(() => {
    const all = registry?.models ?? [];
    return {
      total: all.length,
      online: all.filter((item) => item.enabled).length,
      featured: all.filter((item) => item.featured).length,
      providers:
        registry?.providers.filter((item) => item.status === "connected")
          .length ?? 0,
    };
  }, [registry]);

  const mutate = async (
    id: string,
    request: () => Promise<Response>,
    success: string,
  ) => {
    setBusy(id);
    setError("");
    try {
      await readJson(await request());
      await loadRegistry();
      notify(success);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "操作失败。");
      return false;
    } finally {
      setBusy("");
    }
  };

  const openCreateModel = () => {
    setEditingModel(null);
    setModelForm(emptyModel);
    setModelDialogOpen(true);
  };

  const openEditModel = (model: ModelCatalogItem) => {
    setEditingModel(model);
    setModelForm(model);
    setModelDialogOpen(true);
  };

  const submitModel = async (event: FormEvent) => {
    event.preventDefault();
    const path = editingModel
      ? `/admin/api/models/${encodeURIComponent(editingModel.id)}`
      : "/admin/api/models";
    const success = await mutate(
      "model-form",
      () =>
        fetch(path, {
          method: editingModel ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(modelForm),
        }),
      editingModel ? "模型信息已更新" : "模型已加入目录",
    );
    if (success) setModelDialogOpen(false);
  };

  const toggleModel = (model: ModelCatalogItem) =>
    mutate(
      model.id,
      () =>
        fetch(`/admin/api/models/${encodeURIComponent(model.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...model, enabled: !model.enabled }),
        }),
      model.enabled ? "模型已下线" : "模型已上线",
    );

  const removeModel = async (model: ModelCatalogItem) => {
    if (confirmDelete !== model.id) {
      setConfirmDelete(model.id);
      window.setTimeout(() => setConfirmDelete(""), 3000);
      return;
    }
    setConfirmDelete("");
    await mutate(
      model.id,
      () =>
        fetch(`/admin/api/models/${encodeURIComponent(model.id)}`, {
          method: "DELETE",
        }),
      "模型已删除",
    );
  };

  const submitProvider = async (event: FormEvent) => {
    event.preventDefault();
    const success = await mutate(
      "provider-form",
      () =>
        fetch("/admin/api/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(providerForm),
        }),
      "供应商密钥已安全保存",
    );
    if (success) {
      setProviderDialogOpen(false);
      setProviderForm(emptyProvider);
      setShowKey(false);
    }
  };

  const toggleProvider = (provider: ModelProvider) =>
    mutate(
      provider.id,
      () =>
        fetch(`/admin/api/providers/${encodeURIComponent(provider.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...provider,
            status: provider.status === "disabled" ? "connected" : "disabled",
          }),
        }),
      provider.status === "disabled" ? "供应商已启用" : "供应商已停用",
    );

  return (
    <AppShell>
      <main className="page admin-models-page">
        <PageHeader
          eyebrow="ADMIN CONSOLE"
          title="模型管理"
          description="管理前台模型目录、供应商凭据与上线状态。所有密钥仅在服务端加密保存。"
          actions={
            <>
              <Link href="/models" className="button secondary">
                <ArrowLeft size={15} />
                查看模型市场
              </Link>
              <button className="button primary" onClick={openCreateModel}>
                <Plus size={15} />
                新增模型
              </button>
            </>
          }
        />

        <section className="admin-metric-strip" aria-label="模型目录概览">
          <div>
            <span>
              <Boxes size={17} />
            </span>
            <p>
              <small>目录模型</small>
              <strong>{stats.total}</strong>
            </p>
            <em>全部记录</em>
          </div>
          <div>
            <span>
              <Activity size={17} />
            </span>
            <p>
              <small>已上线</small>
              <strong>{stats.online}</strong>
            </p>
            <em className="success">运行正常</em>
          </div>
          <div>
            <span>
              <Star size={17} />
            </span>
            <p>
              <small>精选推荐</small>
              <strong>{stats.featured}</strong>
            </p>
            <em>市场推荐位</em>
          </div>
          <div>
            <span>
              <CloudCog size={17} />
            </span>
            <p>
              <small>供应商</small>
              <strong>{stats.providers}</strong>
            </p>
            <em className="success">已连接</em>
          </div>
        </section>

        {error && (
          <div className="admin-error" role="alert">
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="关闭错误">
              <X size={15} />
            </button>
          </div>
        )}

        <div className="admin-workspace">
          <section className="admin-catalog-panel">
            <div className="admin-section-head">
              <div>
                <h2>模型目录</h2>
                <p>控制模型市场中的展示内容与排序状态</p>
              </div>
              <button
                className="icon-button"
                title="刷新目录"
                onClick={() => void loadRegistry()}
              >
                <RefreshCw size={15} className={loading ? "spin" : ""} />
              </button>
            </div>
            <div className="admin-toolbar">
              <label className="search-field">
                <Search size={15} />
                <input
                  aria-label="搜索管理模型"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索模型、供应商或能力"
                />
              </label>
              <div className="segmented">
                {(
                  [
                    ["all", "全部"],
                    ["enabled", "已上线"],
                    ["disabled", "已下线"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    className={status === value ? "active" : ""}
                    onClick={() => setStatus(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="admin-model-table" aria-live="polite">
              <div className="admin-table-head">
                <span>模型</span>
                <span>类型</span>
                <span>质量</span>
                <span>成本 / 时延</span>
                <span>状态</span>
                <span>操作</span>
              </div>
              {loading && !registry ? (
                <div className="admin-loading">正在读取模型目录…</div>
              ) : models.length ? (
                models.map((model) => (
                  <article key={model.id} className="admin-model-row">
                    <div className="admin-model-identity">
                      <i style={{ background: model.accent }}>
                        {model.name[0]}
                      </i>
                      <span>
                        <strong>
                          {model.name}
                          {model.featured && (
                            <Star size={11} fill="currentColor" />
                          )}
                        </strong>
                        <small>{model.vendor}</small>
                        <p>{model.description}</p>
                      </span>
                    </div>
                    <span className="admin-type">{model.type}</span>
                    <span className="admin-quality">
                      <b>{model.quality}</b>
                      <i>
                        <u style={{ width: `${model.quality}%` }} />
                      </i>
                    </span>
                    <span className="admin-cost">
                      <strong>{model.cost}</strong>
                      <small>{model.latency}</small>
                    </span>
                    <button
                      className={`admin-status ${model.enabled ? "online" : ""}`}
                      disabled={busy === model.id}
                      onClick={() => void toggleModel(model)}
                    >
                      <i />
                      {model.enabled ? "已上线" : "已下线"}
                    </button>
                    <div className="admin-row-actions">
                      <button
                        title="编辑模型"
                        aria-label={`编辑 ${model.name}`}
                        onClick={() => openEditModel(model)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className={confirmDelete === model.id ? "confirm" : ""}
                        title={
                          confirmDelete === model.id
                            ? "再次点击确认删除"
                            : "删除模型"
                        }
                        aria-label={
                          confirmDelete === model.id
                            ? `确认删除 ${model.name}`
                            : `删除 ${model.name}`
                        }
                        onClick={() => void removeModel(model)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="admin-loading">没有符合条件的模型。</div>
              )}
            </div>
          </section>

          <aside className="admin-provider-panel">
            <div className="admin-section-head">
              <div>
                <h2>供应商连接</h2>
                <p>凭据不会返回浏览器</p>
              </div>
              <button
                className="icon-button"
                title="新增供应商"
                onClick={() => setProviderDialogOpen(true)}
              >
                <Plus size={15} />
              </button>
            </div>
            <div className="admin-provider-list">
              {registry?.providers.map((provider) => (
                <article key={provider.id}>
                  <div>
                    <span className={`provider-state ${provider.status}`}>
                      <CloudCog size={15} />
                    </span>
                    <span>
                      <strong>{provider.name}</strong>
                      <small>{provider.baseUrl}</small>
                    </span>
                  </div>
                  <dl>
                    <dt>凭据</dt>
                    <dd>
                      <KeyRound size={11} />
                      {provider.keyHint}
                    </dd>
                    <dt>模型</dt>
                    <dd>{provider.modelCount} 个</dd>
                  </dl>
                  <div>
                    <button
                      onClick={() => void toggleProvider(provider)}
                      disabled={busy === provider.id}
                    >
                      {provider.status === "disabled" ? "启用连接" : "停用连接"}
                    </button>
                    {provider.baseUrl !== "内置模型目录" && (
                      <button
                        className="danger"
                        onClick={() =>
                          void mutate(
                            provider.id,
                            () =>
                              fetch(
                                `/admin/api/providers/${encodeURIComponent(provider.id)}`,
                                { method: "DELETE" },
                              ),
                            "供应商已移除",
                          )
                        }
                      >
                        <Trash2 size={13} />
                        移除
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <div className="admin-security-note">
              <ShieldCheck size={17} />
              <span>
                <strong>服务端凭据保险箱</strong>
                <small>AES-256-GCM 加密落盘，前端只显示状态与末四位。</small>
              </span>
            </div>
          </aside>
        </div>

        {modelDialogOpen && (
          <AdminDialog
            title={editingModel ? "编辑模型" : "新增模型"}
            eyebrow={editingModel ? "CATALOG EDITOR" : "NEW MODEL"}
            onClose={() => setModelDialogOpen(false)}
          >
            <form onSubmit={submitModel} className="admin-form">
              <div className="admin-form-grid">
                <label>
                  <span>模型名称</span>
                  <input
                    required
                    maxLength={80}
                    value={modelForm.name}
                    onChange={(event) =>
                      setModelForm({ ...modelForm, name: event.target.value })
                    }
                    placeholder="例如：Aperture Studio X"
                  />
                </label>
                <label>
                  <span>供应商</span>
                  <input
                    required
                    maxLength={80}
                    value={modelForm.vendor}
                    onChange={(event) =>
                      setModelForm({ ...modelForm, vendor: event.target.value })
                    }
                    placeholder="供应商或实验室"
                  />
                </label>
                <label>
                  <span>模型类型</span>
                  <select
                    value={modelForm.type}
                    onChange={(event) =>
                      setModelForm({
                        ...modelForm,
                        type: event.target.value as ModelInput["type"],
                      })
                    }
                  >
                    {["图像", "视频", "文案", "音频"].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>质量评分</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={modelForm.quality}
                    onChange={(event) =>
                      setModelForm({
                        ...modelForm,
                        quality: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label className="wide">
                  <span>模型介绍</span>
                  <textarea
                    required
                    maxLength={300}
                    rows={4}
                    value={modelForm.description}
                    onChange={(event) =>
                      setModelForm({
                        ...modelForm,
                        description: event.target.value,
                      })
                    }
                    placeholder="介绍模型擅长的任务、风格和适用场景"
                  />
                </label>
                <label>
                  <span>平均时延</span>
                  <input
                    required
                    value={modelForm.latency}
                    onChange={(event) =>
                      setModelForm({
                        ...modelForm,
                        latency: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  <span>调用成本</span>
                  <input
                    required
                    value={modelForm.cost}
                    onChange={(event) =>
                      setModelForm({ ...modelForm, cost: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>许可说明</span>
                  <input
                    required
                    value={modelForm.license}
                    onChange={(event) =>
                      setModelForm({
                        ...modelForm,
                        license: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  <span>品牌色</span>
                  <span className="color-field">
                    <input
                      type="color"
                      value={modelForm.accent}
                      onChange={(event) =>
                        setModelForm({
                          ...modelForm,
                          accent: event.target.value,
                        })
                      }
                    />
                    <input
                      value={modelForm.accent}
                      onChange={(event) =>
                        setModelForm({
                          ...modelForm,
                          accent: event.target.value,
                        })
                      }
                    />
                  </span>
                </label>
              </div>
              <div className="admin-form-options">
                <label>
                  <input
                    type="checkbox"
                    checked={modelForm.enabled}
                    onChange={(event) =>
                      setModelForm({
                        ...modelForm,
                        enabled: event.target.checked,
                      })
                    }
                  />
                  保存后立即上线
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={modelForm.featured}
                    onChange={(event) =>
                      setModelForm({
                        ...modelForm,
                        featured: event.target.checked,
                      })
                    }
                  />
                  设为精选推荐
                </label>
              </div>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setModelDialogOpen(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={busy === "model-form"}
                >
                  {busy === "model-form" ? "正在保存…" : "保存模型"}
                </button>
              </div>
            </form>
          </AdminDialog>
        )}

        {providerDialogOpen && (
          <AdminDialog
            title="新增供应商"
            eyebrow="PROVIDER CONNECTION"
            onClose={() => setProviderDialogOpen(false)}
          >
            <form onSubmit={submitProvider} className="admin-form">
              <label>
                <span>供应商名称</span>
                <input
                  required
                  value={providerForm.name}
                  onChange={(event) =>
                    setProviderForm({
                      ...providerForm,
                      name: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                <span>接口地址</span>
                <input
                  required
                  type="url"
                  value={providerForm.baseUrl}
                  onChange={(event) =>
                    setProviderForm({
                      ...providerForm,
                      baseUrl: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                <span>API Key 密钥</span>
                <span className="secret-field">
                  <input
                    required
                    type={showKey ? "text" : "password"}
                    autoComplete="new-password"
                    value={providerForm.apiKey}
                    onChange={(event) =>
                      setProviderForm({
                        ...providerForm,
                        apiKey: event.target.value,
                      })
                    }
                    placeholder="粘贴供应商 API Key"
                  />
                  <button
                    type="button"
                    aria-label={showKey ? "隐藏 API Key" : "显示 API Key"}
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </label>
              <p className="admin-form-note">
                <ShieldCheck size={14} />
                密钥提交后由服务端加密保存，管理页面和接口都不会返回明文。
              </p>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setProviderDialogOpen(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={busy === "provider-form"}
                >
                  {busy === "provider-form" ? "正在保存…" : "保存连接"}
                </button>
              </div>
            </form>
          </AdminDialog>
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

function AdminDialog({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="dialog-layer">
      <button className="dialog-backdrop" aria-label="关闭" onClick={onClose} />
      <section
        className="dialog admin-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            <span className="eyebrow accent">{eyebrow}</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" aria-label="关闭" onClick={onClose}>
            <X size={17} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
