import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { listGalleryAlbums, listGalleryPhotos, type GalleryAlbumItem, type GalleryPhotoItem } from "../lib/api-client";

/** Gap-remediation pass — closes Unit 49's "mobile viewing UI not built" note for the S3-backed gallery. */
export function GalleryScreen({ accessToken, branchId }: { accessToken: string; branchId: string }) {
  const { t } = useTranslation();
  const [albums, setAlbums] = useState<GalleryAlbumItem[]>([]);
  const [activeAlbum, setActiveAlbum] = useState<GalleryAlbumItem | null>(null);
  const [photos, setPhotos] = useState<GalleryPhotoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlbums = useCallback(async () => {
    setLoading(true);
    try {
      setAlbums(await listGalleryAlbums(accessToken, branchId));
    } finally {
      setLoading(false);
    }
  }, [accessToken, branchId]);

  useEffect(() => {
    void loadAlbums();
  }, [loadAlbums]);

  useEffect(() => {
    if (!activeAlbum) return;
    setLoading(true);
    listGalleryPhotos(accessToken, activeAlbum.id)
      .then(setPhotos)
      .finally(() => setLoading(false));
  }, [accessToken, activeAlbum]);

  if (loading && !activeAlbum) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (activeAlbum) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => setActiveAlbum(null)}>
          <Text style={styles.backLink}>{t("gallery.back")}</Text>
        </TouchableOpacity>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={photos}
            keyExtractor={(item) => item.id}
            numColumns={2}
            renderItem={({ item }) => (
              <View style={styles.photoCell}>
                <Image source={{ uri: item.url }} style={styles.photo} />
                {item.caption ? <Text style={styles.caption}>{item.caption}</Text> : null}
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>{t("gallery.noPhotos")}</Text>}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={albums}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => setActiveAlbum(item)}>
            <Text>{item.title}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t("gallery.noAlbums")}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 8 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  backLink: { color: "#4F46E5", fontWeight: "600", marginBottom: 8 },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 24 },
  photoCell: { flex: 1, margin: 4 },
  photo: { width: "100%", aspectRatio: 1, borderRadius: 6, backgroundColor: "#F3F4F6" },
  caption: { fontSize: 12, color: "#6B7280", marginTop: 4 },
});
