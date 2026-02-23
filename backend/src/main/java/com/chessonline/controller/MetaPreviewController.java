package com.chessonline.controller;

import com.chessonline.model.Game;
import com.chessonline.model.Invite;
import com.chessonline.model.Puzzle;
import com.chessonline.repository.GameRepository;
import com.chessonline.repository.InviteRepository;
import com.chessonline.repository.MoveRepository;
import com.chessonline.repository.PuzzleRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/meta")
public class MetaPreviewController {

    private static final String START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    @Autowired
    private InviteRepository inviteRepository;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private PuzzleRepository puzzleRepository;

    @Autowired
    private MoveRepository moveRepository;

    private String getText(String lang, String ruText, String enText) {
        return "ru".equals(lang) ? ruText : enText;
    }

    @GetMapping(value = "/invite/{inviteId}", produces = "text/html;charset=UTF-8")
    public ResponseEntity<String> inviteMeta(@PathVariable String inviteId, HttpServletRequest request, 
                                              @RequestParam(defaultValue = "en") String lang) {
        String normalizedId = inviteId.toUpperCase();
        String baseUrl = getBaseUrl(request);
        Optional<Invite> inviteOpt = inviteRepository.findByIdWithUsers(normalizedId);

        String title;
        String description;

        if (inviteOpt.isPresent()) {
            Invite invite = inviteOpt.get();
            String creatorName = safe(invite.getCreator().getUsername(), "Player");
            int rating = invite.getCreator().getRating() != null ? invite.getCreator().getRating() : 1200;
            String mode = humanGameMode(invite.getGameMode(), lang);
            String tc = safe(invite.getTimeControl(), "10+0");
            String ratedLabel = invite.isRated() ? 
                    getText(lang, "рейтинговую", "rated") : 
                    getText(lang, "нерейтинговую", "casual");

            title = getText(lang, 
                    "⚔️ Вызов на доске: " + creatorName,
                    "♟️ Chess challenge from " + creatorName);
            description = getText(lang,
                    creatorName + " (" + rating + ") зовёт тебя в " + ratedLabel + " " + mode + " " + tc + ". Прими вызов и начни игру.",
                    creatorName + " (" + rating + ") invites you to a " + ratedLabel + " " + mode + " (" + tc + ") game. Accept the challenge!");
        } else {
            title = getText(lang, "♟️ Приглашение в шахматы", "♟️ Chess invitation");
            description = getText(lang, 
                    "Перейди по ссылке, чтобы принять вызов и начать игру.",
                    "Follow the link to accept the challenge and play a game.");
        }

        String imageUrl = baseUrl + "/api/meta/image/invite/" + encodePath(normalizedId) + ".png";
        String targetUrl = baseUrl + "/invite/" + encodePath(normalizedId);

        return htmlResponse(buildMetaHtml(title, description, imageUrl, targetUrl));
    }

    @GetMapping(value = "/game/{gameId}", produces = "text/html;charset=UTF-8")
    public ResponseEntity<String> gameMeta(@PathVariable String gameId, HttpServletRequest request,
                                            @RequestParam(defaultValue = "en") String lang) {
        String baseUrl = getBaseUrl(request);
        Optional<Game> gameOpt = gameRepository.findById(gameId);

        String title;
        String description;

        if (gameOpt.isPresent()) {
            Game game = gameOpt.get();
            String white = safe(game.getPlayerWhite().getUsername(), "White");
            String black = safe(game.getPlayerBlack().getUsername(), "Black");
            int whiteRating = game.getPlayerWhite().getRating() != null ? game.getPlayerWhite().getRating() : 1200;
            int blackRating = game.getPlayerBlack().getRating() != null ? game.getPlayerBlack().getRating() : 1200;
            String speed = inferSpeed(game.getTimeControl(), lang);
            String tc = safe(game.getTimeControl(), "10+0");
            String ratedLabel = game.isRated() ? 
                    getText(lang, "рейтинговую", "rated") : 
                    getText(lang, "нерейтинговую", "casual");
            int plies = moveRepository.findByGameIdOrderByMoveNumber(game.getId()).size();
            int moves = (plies + 1) / 2;
            String result = safe(game.getResult(), "*");
            String reason = humanResultReason(game.getResultReason(), lang);

            if ("active".equalsIgnoreCase(game.getStatus())) {
                title = getText(lang,
                        "♟️ " + speed + " • " + white + " vs " + black,
                        "♟️ " + speed + ": " + white + " vs " + black);
                description = getText(lang,
                        white + " (" + whiteRating + ") играет против " + black + " (" + blackRating + ") в " + ratedLabel + " " + speed + " (" + tc + "). Смотрите игру вживую!",
                        white + " (" + whiteRating + ") is playing " + black + " (" + blackRating + ") in a " + ratedLabel + " " + speed + " (" + tc + "). Watch live!");
            } else {
                title = getText(lang,
                        "♟️ Завершено: " + white + " vs " + black,
                        "♟️ Finished: " + white + " vs " + black);
                String reasonText = reason.isBlank() ? "" : " " + getText(lang, "по", "by") + " " + reason;
                description = getText(lang,
                        white + " (" + whiteRating + ") сыграл против " + black + " (" + blackRating + ") в " + ratedLabel + " " + speed + " (" + tc + "). Результат: " + result + reasonText + (moves > 0 ? " после " + moves + " ходов." : ".") + " Смотрите и анализируйте партию!",
                        white + " (" + whiteRating + ") played " + black + " (" + blackRating + ") in a " + ratedLabel + " " + speed + " (" + tc + "). Result: " + result + reasonText + (moves > 0 ? " after " + moves + " moves." : ".") + " Watch and analyze!");
            }
        } else {
            title = getText(lang, "♟️ Шахматная партия", "♟️ Chess game");
            description = getText(lang, 
                    "Откройте ссылку, чтобы смотреть, анализировать и обсуждать партию.",
                    "Open the link to watch, analyze, and discuss the game.");
        }

        String imageUrl = baseUrl + "/api/meta/image/game/" + encodePath(gameId) + ".png";
        String targetUrl = baseUrl + "/game/" + encodePath(gameId);

        return htmlResponse(buildMetaHtml(title, description, imageUrl, targetUrl));
    }

    @GetMapping(value = "/puzzle/{puzzleId}", produces = "text/html;charset=UTF-8")
    public ResponseEntity<String> puzzleMeta(@PathVariable String puzzleId, HttpServletRequest request,
                                              @RequestParam(defaultValue = "en") String lang) {
        String baseUrl = getBaseUrl(request);
        Optional<Puzzle> puzzleOpt = puzzleRepository.findById(puzzleId);

        String title;
        String description;

        if (puzzleOpt.isPresent()) {
            Puzzle puzzle = puzzleOpt.get();
            String themes = normalizeList(safe(puzzle.getThemes(), "tactics"), ",", 4);
            String openings = normalizeList(safe(puzzle.getOpeningTags(), ""), " ", 3);
            boolean hasKnownThemes = !themes.isBlank() && !"unknown".equalsIgnoreCase(themes) && !"unknown themes".equalsIgnoreCase(themes);
            boolean hasKnownOpenings = !openings.isBlank() && !"unknown".equalsIgnoreCase(openings) && !"unknown opening".equalsIgnoreCase(openings);
            
            title = getText(lang,
                    "🧩 Пазл " + puzzle.getId() + " • Elo " + puzzle.getRating(),
                    "🧩 Puzzle " + puzzle.getId() + " • Elo " + puzzle.getRating());
            description = getText(lang,
                    "Найди лучший ход в этой позиции. Пазл рейтинг " + puzzle.getRating() + 
                    (hasKnownThemes ? ". Темы: " + themes : "") +
                (hasKnownOpenings ? ". Дебюты: " + openings : "") +
                    ". Сможешь решить без подсказок?",
                    "Find the best move in this position. Puzzle rating " + puzzle.getRating() +
                    (hasKnownThemes ? ". Themes: " + themes : "") +
                (hasKnownOpenings ? ". Openings: " + openings : "") +
                    ". Can you solve it?");
        } else {
            title = getText(lang, "🧩 Шахматный пазл", "🧩 Chess puzzle");
            description = getText(lang, 
                    "Решите этот тактический пазл и проверьте свой расчет.",
                    "Solve this tactical puzzle and test your calculation.");
        }

        String imageUrl = baseUrl + "/api/meta/image/puzzle/" + encodePath(puzzleId) + ".png";
        String targetUrl = baseUrl + "/puzzle/" + encodePath(puzzleId);

        return htmlResponse(buildMetaHtml(title, description, imageUrl, targetUrl));
    }

    @GetMapping(value = "/image/invite/{inviteId}.png", produces = "image/png")
    public ResponseEntity<byte[]> inviteImagePng(@PathVariable String inviteId, 
                                                  @RequestParam(defaultValue = "en") String lang) {
        Optional<Invite> inviteOpt = inviteRepository.findByIdWithUsers(inviteId.toUpperCase());
        String title;
        String subtitle;
        if (inviteOpt.isPresent()) {
            Invite invite = inviteOpt.get();
            String creator = safe(invite.getCreator().getUsername(), "Player");
            int rating = invite.getCreator().getRating() != null ? invite.getCreator().getRating() : 1200;
            String creatorFormatted = creator + " ●" + rating;
            subtitle = humanGameMode(invite.getGameMode(), lang) + " • " + safe(invite.getTimeControl(), "10+0");
            title = creatorFormatted;
        } else {
            title = getText(lang, "Приглашение", "Invite");
            subtitle = getText(lang, "Начальная позиция", "Start position");
        }
        return pngResponse(ChessPngRenderer.renderBoard(START_FEN, title, subtitle));
    }

    @GetMapping(value = "/image/game/{gameId}.png", produces = "image/png")
    public ResponseEntity<byte[]> gameImagePng(@PathVariable String gameId,
                                                @RequestParam(defaultValue = "en") String lang) {
        Optional<Game> gameOpt = gameRepository.findById(gameId);
        
        String title;
        String subtitle;
        String fen = START_FEN;
        
        if (gameOpt.isPresent()) {
            Game game = gameOpt.get();
            String white = safe(game.getPlayerWhite().getUsername(), "White");
            String black = safe(game.getPlayerBlack().getUsername(), "Black");
            int whiteRating = game.getPlayerWhite().getRating() != null ? game.getPlayerWhite().getRating() : 1200;
            int blackRating = game.getPlayerBlack().getRating() != null ? game.getPlayerBlack().getRating() : 1200;
            String speed = inferSpeed(game.getTimeControl(), lang);
            String tc = safe(game.getTimeControl(), "10+0");
            
            title = white + " ●" + whiteRating + " vs " + black + " ●" + blackRating;
            subtitle = speed + " • " + tc;
            fen = safe(game.getFenCurrent(), START_FEN);
        } else {
            title = getText(lang, "Шахматная партия", "Chess game");
            subtitle = getText(lang, "Смотрите партию", "Watch the game");
        }
        
        return pngResponse(ChessPngRenderer.renderBoard(fen, title, subtitle));
    }

    @GetMapping(value = "/image/puzzle/{puzzleId}.png", produces = "image/png")
    public ResponseEntity<byte[]> puzzleImagePng(@PathVariable String puzzleId,
                                                  @RequestParam(defaultValue = "en") String lang) {
        Optional<Puzzle> puzzleOpt = puzzleRepository.findById(puzzleId);
        String title;
        String subtitle;
        String fen = START_FEN;
        
        if (puzzleOpt.isPresent()) {
            Puzzle puzzle = puzzleOpt.get();
            subtitle = getText(lang, "Пазл • Elo ", "Puzzle • Elo ") + puzzle.getRating();
            title = getText(lang, "Найди лучший ход", "Find the best move");
            fen = safe(puzzle.getFen(), START_FEN);
        } else {
            title = getText(lang, "Пазл", "Puzzle");
            subtitle = getText(lang, "Решите задачу", "Solve the puzzle");
        }
        
        return pngResponse(ChessPngRenderer.renderBoard(fen, title, subtitle));
    }

    private ResponseEntity<String> htmlResponse(String html) {
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                .body(html);
    }

    private ResponseEntity<byte[]> pngResponse(byte[] pngData) {
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=300")
                .body(pngData);
    }

    private String buildMetaHtml(String title, String description, String imageUrl, String targetUrl) {
        String escapedTitle = esc(title);
        String escapedDescription = esc(description);
        String escapedImage = esc(imageUrl);
        String escapedTarget = esc(targetUrl);

        return "<!doctype html><html lang=\"en\"><head>"
                + "<meta charset=\"UTF-8\"/>"
                + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/>"
                + "<title>" + escapedTitle + "</title>"
                + "<meta name=\"description\" content=\"" + escapedDescription + "\"/>"
                + "<meta property=\"og:type\" content=\"website\"/>"
                + "<meta property=\"og:title\" content=\"" + escapedTitle + "\"/>"
                + "<meta property=\"og:description\" content=\"" + escapedDescription + "\"/>"
                + "<meta property=\"og:image\" content=\"" + escapedImage + "\"/>"
                + "<meta property=\"og:image:secure_url\" content=\"" + escapedImage + "\"/>"
                + "<meta property=\"og:image:type\" content=\"image/png\"/>"
                + "<meta property=\"og:image:width\" content=\"1200\"/>"
                + "<meta property=\"og:image:height\" content=\"630\"/>"
                + "<meta property=\"og:url\" content=\"" + escapedTarget + "\"/>"
                + "<meta name=\"twitter:card\" content=\"summary_large_image\"/>"
                + "<meta name=\"twitter:title\" content=\"" + escapedTitle + "\"/>"
                + "<meta name=\"twitter:description\" content=\"" + escapedDescription + "\"/>"
                + "<meta name=\"twitter:image\" content=\"" + escapedImage + "\"/>"
                + "<meta http-equiv=\"refresh\" content=\"0;url=" + escapedTarget + "\"/>"
                + "</head><body>"
                + "<script>window.location.replace(\"" + jsEsc(targetUrl) + "\");</script>"
                + "</body></html>";
    }

    private String safe(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String normalizeList(String raw, String separator, int maxItems) {
        String[] parts = raw.split(separator);
        StringBuilder result = new StringBuilder();
        int count = 0;
        for (String item : parts) {
            String trimmed = item == null ? "" : item.trim();
            if (trimmed.isEmpty()) continue;
            if (count > 0) result.append(", ");
            result.append(trimmed.replace('_', ' '));
            count++;
            if (count >= maxItems) break;
        }
        return count == 0 ? "unknown" : result.toString();
    }

    private String getBaseUrl(HttpServletRequest request) {
        String forwardedProto = request.getHeader("X-Forwarded-Proto");
        String forwardedHost = request.getHeader("X-Forwarded-Host");
        String proto = forwardedProto != null && !forwardedProto.isBlank() ? forwardedProto : request.getScheme();
        String host = forwardedHost != null && !forwardedHost.isBlank() ? forwardedHost : request.getHeader("Host");
        return proto + "://" + host;
    }

    private String encodePath(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private String humanGameMode(String mode, String lang) {
        Map<String, String> map = "ru".equals(lang) ?
                Map.of(
                        "bullet", "Молния",
                        "blitz", "Блиц",
                        "rapid", "Рапид",
                        "classic", "Классика",
                        "custom", "Пользовательская"
                ) :
                Map.of(
                        "bullet", "Bullet",
                        "blitz", "Blitz",
                        "rapid", "Rapid",
                        "classic", "Classical",
                        "custom", "Custom"
                );
        if (mode == null || mode.isBlank()) return getText(lang, "Рапид", "Rapid");
        String normalized = mode.toLowerCase();
        return map.getOrDefault(normalized, capitalize(normalized));
    }

    private String humanResultReason(String reason, String lang) {
        if (reason == null || reason.isBlank()) return "";
        Map<String, String> map = "ru".equals(lang) ?
                Map.of(
                        "checkmate", "мат",
                        "resignation", "сдача",
                        "timeout", "время вышло",
                        "stalemate", "пат",
                        "agreement", "согласие на ничью",
                        "abandonment", "отказ"
                ) :
                Map.of(
                        "checkmate", "checkmate",
                        "resignation", "resignation",
                        "timeout", "timeout",
                        "stalemate", "stalemate",
                        "agreement", "draw agreement",
                        "abandonment", "abandonment"
                );
        return map.getOrDefault(reason.toLowerCase(), reason);
    }

    private String inferSpeed(String timeControl, String lang) {
        if (timeControl == null || !timeControl.contains("+")) {
            return getText(lang, "Рапид", "Rapid");
        }

        String[] parts = timeControl.split("\\+");
        int minutes;
        int increment;
        try {
            minutes = Integer.parseInt(parts[0]);
            increment = Integer.parseInt(parts[1]);
        } catch (Exception e) {
            return getText(lang, "Рапид", "Rapid");
        }

        int estimatedSeconds = minutes * 60 + increment * 40;
        String[] speedsRu = {"Молния", "Блиц", "Рапид", "Классика"};
        String[] speedsEn = {"Bullet", "Blitz", "Rapid", "Classical"};
        String[] speeds = "ru".equals(lang) ? speedsRu : speedsEn;
        
        if (estimatedSeconds <= 179) return speeds[0];
        if (estimatedSeconds <= 479) return speeds[1];
        if (estimatedSeconds <= 1499) return speeds[2];
        return speeds[3];
    }

    private String capitalize(String text) {
        if (text == null || text.isBlank()) return "";
        return Character.toUpperCase(text.charAt(0)) + text.substring(1);
    }

    private String esc(String value) {
        if (value == null) return "";
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private String jsEsc(String value) {
        if (value == null) return "";
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");
    }

    private static class ChessPngRenderer {

        private static final Color BG = new Color(17, 24, 39);
        private static final Color PANEL = new Color(31, 41, 55);
        private static final Color LIGHT = new Color(240, 217, 181);
        private static final Color DARK = new Color(181, 136, 99);
        private static final Color WHITE_PIECE = new Color(248, 250, 252);
        private static final Color BLACK_PIECE = new Color(17, 24, 39);
        private static final Color TEXT_PRIMARY = new Color(249, 250, 251);
        private static final Color TEXT_SECONDARY = new Color(209, 213, 219);
        private static final Color TEXT_MUTED = new Color(156, 163, 175);

        private static final int W = 1200;
        private static final int H = 630;

        // Unicode chess piece symbols
        private static final Map<Character, String> PIECE_SYMBOLS = Map.ofEntries(
            Map.entry('P', "♙"), Map.entry('N', "♘"), Map.entry('B', "♗"), Map.entry('R', "♖"),
            Map.entry('Q', "♕"), Map.entry('K', "♔"), Map.entry('p', "♟"), Map.entry('n', "♞"),
            Map.entry('b', "♝"), Map.entry('r', "♜"), Map.entry('q', "♛"), Map.entry('k', "♚")
        );

        static byte[] renderBoard(String fen, String title, String subtitle) {
            try {
                BufferedImage image = new BufferedImage(W, H, BufferedImage.TYPE_INT_ARGB);
                Graphics2D g = image.createGraphics();
                g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

                g.setColor(BG);
                g.fillRect(0, 0, W, H);

                g.setColor(PANEL);
                g.fillRoundRect(40, 40, 550, 550, 20, 20);

                int bx = 55;
                int by = 55;
                int cell = 66;

                // Draw board
                for (int rank = 0; rank < 8; rank++) {
                    for (int file = 0; file < 8; file++) {
                        g.setColor(((rank + file) % 2 == 0) ? LIGHT : DARK);
                        g.fillRect(bx + file * cell, by + rank * cell, cell, cell);
                    }
                }

                // Draw pieces
                String placement = fen != null && fen.contains(" ") ? fen.split(" ")[0] : fen;
                if (placement == null || placement.isBlank()) {
                    placement = START_FEN.split(" ")[0];
                }

                g.setFont(new Font("SansSerif", Font.BOLD, 40));
                String[] rows = placement.split("/");
                for (int rank = 0; rank < Math.min(8, rows.length); rank++) {
                    int file = 0;
                    for (char c : rows[rank].toCharArray()) {
                        if (Character.isDigit(c)) {
                            file += Character.getNumericValue(c);
                        } else {
                            int cx = bx + file * cell + cell / 2;
                            int cy = by + rank * cell + cell / 2;
                            boolean whitePiece = Character.isUpperCase(c);
                            
                            g.setColor(whitePiece ? WHITE_PIECE : BLACK_PIECE);
                            String symbol = PIECE_SYMBOLS.getOrDefault(c, String.valueOf(c));
                            FontMetrics fm = g.getFontMetrics();
                            int tx = cx - fm.stringWidth(symbol) / 2;
                            int ty = cy + (fm.getAscent() - fm.getDescent()) / 2;
                            g.drawString(symbol, tx, ty);
                            file++;
                        }
                        if (file >= 8) break;
                    }
                }

                // Draw text on right side
                g.setFont(new Font("SansSerif", Font.BOLD, 50));
                g.setColor(TEXT_PRIMARY);
                g.drawString(trim(title, 30), 650, 190);

                g.setFont(new Font("SansSerif", Font.PLAIN, 30));
                g.setColor(TEXT_SECONDARY);
                g.drawString(trim(subtitle, 48), 650, 245);

                g.setFont(new Font("SansSerif", Font.PLAIN, 24));
                g.setColor(TEXT_MUTED);
                g.drawString("onchess.online", 650, 560);

                g.dispose();
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(image, "png", baos);
                return baos.toByteArray();
            } catch (Exception e) {
                return new byte[0];
            }
        }

        private static String trim(String value, int maxLen) {
            if (value == null) return "";
            if (value.length() <= maxLen) return value;
            return value.substring(0, Math.max(0, maxLen - 1)) + "…";
        }
    }
}
