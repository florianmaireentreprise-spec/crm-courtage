"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload, FileText, Download, Archive, Filter, Loader2, X, Eye, Trash2,
} from "lucide-react";

// ── Taxonomy ──

const CATEGORIES: Record<string, { label: string; icon: string }> = {
  administratif: { label: "Administratif", icon: "📁" },
  conseil: { label: "Conseil", icon: "💡" },
  contractuel: { label: "Contractuel", icon: "📄" },
  echange: { label: "Echange", icon: "📨" },
};

const TYPES_DOCUMENT: Record<string, string> = {
  piece_identite: "Piece d'identite",
  justificatif_domicile: "Justificatif de domicile",
  rib: "RIB",
  kbis: "KBIS",
  statuts: "Statuts",
  fiche_connaissance_client: "Fiche connaissance client",
  audit: "Audit",
  synthese_rdv: "Synthese RDV",
  comparatif: "Comparatif",
  simulation: "Simulation",
  recommandation: "Recommandation",
  contrat: "Contrat",
  avenant: "Avenant",
  conditions_particulieres: "Conditions particulieres",
  attestation: "Attestation",
  resiliation: "Resiliation",
  courrier_compagnie: "Courrier compagnie",
  piece_recue_email: "Piece recue par email",
  piece_envoyee_client: "Piece envoyee au client",
  document_libre: "Document libre",
};

type DocumentRow = {
  id: string;
  nomFichier: string;
  nomAffiche: string;
  categorie: string;
  typeDocument: string;
  source: string;
  mimeType: string;
  tailleOctets: number;
  dateDocument: string | null;
  archive: boolean;
  notes: string | null;
  contratId: string | null;
  opportuniteId: string | null;
  dealId: string | null;
  createdAt: string;
};

type LinkedEntity = { id: string; label: string };

type Props = {
  clientId: string;
  contrats: LinkedEntity[];
  opportunites: LinkedEntity[];
  deals: LinkedEntity[];
};

export function DocumentsTab({ clientId, contrats, opportunites, deals }: Props) {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategorie, setFilterCategorie] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Upload form state
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategorie, setUploadCategorie] = useState("administratif");
  const [uploadType, setUploadType] = useState("document_libre");
  const [uploadNomAffiche, setUploadNomAffiche] = useState("");
  const [uploadDateDoc, setUploadDateDoc] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadContratId, setUploadContratId] = useState("");
  const [uploadOpportuniteId, setUploadOpportuniteId] = useState("");
  const [uploadDealId, setUploadDealId] = useState("");

  // Fetch documents
  async function fetchDocuments() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ clientId });
      if (showArchived) params.set("archive", "true");
      if (filterCategorie !== "all") params.set("categorie", filterCategorie);
      const res = await fetch(`/api/documents?${params}`);
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch {
      console.error("[DocumentsTab] fetch error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, filterCategorie, showArchived]);

  // Upload handler
  async function handleUpload() {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", uploadFile);
      formData.set("clientId", clientId);
      formData.set("categorie", uploadCategorie);
      formData.set("typeDocument", uploadType);
      if (uploadNomAffiche) formData.set("nomAffiche", uploadNomAffiche);
      if (uploadDateDoc) formData.set("dateDocument", uploadDateDoc);
      if (uploadNotes) formData.set("notes", uploadNotes);
      if (uploadContratId) formData.set("contratId", uploadContratId);
      if (uploadOpportuniteId) formData.set("opportuniteId", uploadOpportuniteId);
      if (uploadDealId) formData.set("dealId", uploadDealId);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erreur d'upload");
        return;
      }

      // Reset form and refresh
      resetUploadForm();
      setShowUpload(false);
      await fetchDocuments();
    } catch {
      alert("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  }

  function resetUploadForm() {
    setUploadFile(null);
    setUploadCategorie("administratif");
    setUploadType("document_libre");
    setUploadNomAffiche("");
    setUploadDateDoc("");
    setUploadNotes("");
    setUploadContratId("");
    setUploadOpportuniteId("");
    setUploadDealId("");
    if (fileRef.current) fileRef.current.value = "";
  }

  // Archive handler
  async function handleArchive(docId: string) {
    setArchiving(docId);
    try {
      await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: true }),
      });
      await fetchDocuments();
    } catch {
      console.error("[DocumentsTab] archive error");
    } finally {
      setArchiving(null);
    }
  }

  // Delete handler (with prior confirmation)
  async function handleDelete(docId: string) {
    setDeleting(docId);
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erreur lors de la suppression");
        return;
      }
      await fetchDocuments();
    } catch {
      alert("Erreur lors de la suppression du document");
    } finally {
      setDeleting(null);
      setConfirmDeleteId(null);
    }
  }

  // Download handler
  function handleDownload(docId: string) {
    window.open(`/api/documents/${docId}/download`, "_blank");
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={filterCategorie} onValueChange={setFilterCategorie}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes categories</SelectItem>
              {Object.entries(CATEGORIES).map(([key, { label, icon }]) => (
                <SelectItem key={key} value={key}>
                  {icon} {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={showArchived ? "secondary" : "ghost"}
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="h-3 w-3" />
            {showArchived ? "Archives incluses" : "Voir archives"}
          </Button>
        </div>
        <Button
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => setShowUpload(!showUpload)}
        >
          <Upload className="h-3 w-3" />
          Ajouter un document
        </Button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Nouveau document</h4>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setShowUpload(false); resetUploadForm(); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* File */}
            <div className="space-y-1">
              <Label className="text-xs">Fichier *</Label>
              <Input
                ref={fileRef}
                type="file"
                className="text-xs h-9"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setUploadFile(f);
                  if (f && !uploadNomAffiche) setUploadNomAffiche(f.name);
                }}
              />
            </div>

            {/* Display name */}
            <div className="space-y-1">
              <Label className="text-xs">Nom affiche</Label>
              <Input
                className="text-xs h-9"
                value={uploadNomAffiche}
                onChange={(e) => setUploadNomAffiche(e.target.value)}
                placeholder="Nom du document"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <Label className="text-xs">Categorie *</Label>
              <Select value={uploadCategorie} onValueChange={setUploadCategorie}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, { label, icon }]) => (
                    <SelectItem key={key} value={key}>
                      {icon} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-1">
              <Label className="text-xs">Type de document *</Label>
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPES_DOCUMENT).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Document date */}
            <div className="space-y-1">
              <Label className="text-xs">Date du document</Label>
              <Input
                type="date"
                className="text-xs h-9"
                value={uploadDateDoc}
                onChange={(e) => setUploadDateDoc(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input
                className="text-xs h-9"
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                placeholder="Notes optionnelles"
              />
            </div>

            {/* Link to contract */}
            {contrats.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Lier a un contrat</Label>
                <Select value={uploadContratId} onValueChange={setUploadContratId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {contrats.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Link to opportunity */}
            {opportunites.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Lier a une opportunite</Label>
                <Select value={uploadOpportuniteId} onValueChange={setUploadOpportuniteId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Aucune" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {opportunites.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Link to deal */}
            {deals.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Lier a un deal</Label>
                <Select value={uploadDealId} onValueChange={setUploadDealId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {deals.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => { setShowUpload(false); resetUploadForm(); }}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1"
              disabled={!uploadFile || uploading}
              onClick={handleUpload}
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {uploading ? "Upload en cours..." : "Envoyer"}
            </Button>
          </div>
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Chargement...
        </div>
      ) : documents.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun document{filterCategorie !== "all" ? " dans cette categorie" : ""}.
          {!showUpload && " Cliquez sur \"Ajouter un document\" pour commencer."}
        </p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const cat = CATEGORIES[doc.categorie];
            const typeLabel = TYPES_DOCUMENT[doc.typeDocument] || doc.typeDocument;
            const isArchiving = archiving === doc.id;

            return (
              <div
                key={doc.id}
                className={`border rounded-lg p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors ${doc.archive ? "opacity-60" : ""}`}
              >
                <div className="shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{doc.nomAffiche}</span>
                    {doc.archive && (
                      <Badge variant="secondary" className="text-[9px]">Archive</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {cat && (
                      <Badge variant="outline" className="text-[10px]">
                        {cat.icon} {cat.label}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">{typeLabel}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatSize(doc.tailleOctets)}
                    </span>
                    {doc.dateDocument && (
                      <span className="text-[10px] text-muted-foreground">
                        Doc: {formatDate(doc.dateDocument)}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      Ajout: {formatDate(doc.createdAt)}
                    </span>
                  </div>
                  {doc.notes && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate italic">
                      {doc.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    title="Ouvrir / Telecharger"
                    onClick={() => handleDownload(doc.id)}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  {!doc.archive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground"
                      title="Archiver"
                      disabled={isArchiving}
                      onClick={() => handleArchive(doc.id)}
                    >
                      {isArchiving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Archive className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                  {confirmDeleteId === doc.id ? (
                    <div className="flex items-center gap-1 ml-1 border border-destructive/30 rounded px-1.5 py-0.5 bg-destructive/5">
                      <span className="text-[10px] text-destructive font-medium">Supprimer ?</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-[10px] text-destructive hover:bg-destructive/10"
                        disabled={deleting === doc.id}
                        onClick={() => handleDelete(doc.id)}
                      >
                        {deleting === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Oui"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-[10px]"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Non
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      title="Supprimer definitivement"
                      onClick={() => setConfirmDeleteId(doc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
