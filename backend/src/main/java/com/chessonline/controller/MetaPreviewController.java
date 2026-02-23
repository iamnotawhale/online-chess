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
import org.springframework.web.bind.annotation.RestController;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
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

    @GetMapping(value = "/invite/{inviteId}", produces = "text/html;charset=UTF-8")
    public ResponseEntity<String> inviteMeta(@PathVariable String inviteId, HttpServletRequest request) {
        String normalizedId = inviteId.toUpperCase();
        String baseUrl = getBaseUrl(request);
        Optional<Invite> inviteOpt = inviteRepository.findById(normalizedId);

        String title;
        String description;

        if (inviteOpt.isPresent()) {
            Invite invite = inviteOpt.get();
            String creatorName = safe(invite.getCreator().getUsername(), "Игрок");
            int rating = invite.getCreator().getRating() != null ? invite.getCreator().getRating() : 1200;
            String mode = humanGameMode(invite.getGameMode());
            String tc = safe(invite.getTimeControl(), "10+0");
            String ratedLabel = invite.isRated() ? "рейтинговую" : "нерейтинговую";

            title = creatorName + " приглашает в партию";
            description = creatorName + " (" + rating + ") приглашает тебя сыграть в "
                    + ratedLabel + " " + mode + " " + tc + ".";
        } else {
            title = "Приглашение в шахматы";
            description = "Переходи по ссылке, чтобы принять приглашение и начать игру.";
        }

        String imageUrl = baseUrl + "/api/meta/image/invite/" + encodePath(normalizedId) + ".svg";
        String targetUrl = baseUrl + "/invite/" + encodePath(normalizedId);

        return htmlResponse(buildMetaHtml(title, description, imageUrl, targetUrl));
    }

    @GetMapping(value = "/game/{gameId}", produces = "text/html;charset=UTF-8")
    public ResponseEntity<String> gameMeta(@PathVariable String gameId, HttpServletRequest request) {
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
            String speed = inferSpeed(game.getTimeControl());
            String tc = safe(game.getTimeControl(), "10+0");
            String ratedLabel = game.isRated() ? "rated" : "casual";
            int plies = moveRepository.findByGameIdOrderByMoveNumber(game.getId()).size();
            int moves = (plies + 1) / 2;

            title = speed + " Chess • " + white + " vs " + black;

            if ("active".equalsIgnoreCase(game.getStatus())) {
                description = white + " (" + whiteRating + ") plays " + black + " (" + blackRating + ") in a "
                        + ratedLabel + " " + speed + " (" + tc + ") game. Click to watch live.";
            } else {
                String result = safe(game.getResult(), "*");
                String reason = humanResultReason(game.getResultReason());
                description = white + " (" + whiteRating + ") played " + black + " (" + blackRating + ") in a "
                        + ratedLabel + " " + speed + " (" + tc + ") game. Result: " + result
                        + (reason.isBlank() ? "" : " by " + reason)
                        + (moves > 0 ? " after " + moves + " moves." : ".")
                        + " Click to replay, analyse, and discuss the game!";
            }
        } else {
            title = "Chess game";
            description = "Open the link to watch, replay, and analyze the game.";
        }

        String imageUrl = baseUrl + "/api/meta/image/game/" + encodePath(gameId) + ".svg";
        String targetUrl = baseUrl + "/game/" + encodePath(gameId);

        return htmlResponse(buildMetaHtml(title, description, imageUrl, targetUrl));
    }

    @GetMapping(value = "/puzzle/{puzzleId}", produces = "text/html;charset=UTF-8")
    public ResponseEntity<String> puzzleMeta(@PathVariable String puzzleId, HttpServletRequest request) {
        String baseUrl = getBaseUrl(request);
        Optional<Puzzle> puzzleOpt = puzzleRepository.findById(puzzleId);

        String title;
        String description;

        if (puzzleOpt.isPresent()) {
            Puzzle puzzle = puzzleOpt.get();
            String themes = safe(puzzle.getThemes(), "tactics").replace(',', ' ');
            title = "Puzzle • " + puzzle.getId();
            description = "Сможешь решить эту задачу? Пазл " + puzzle.getId()
                    + " (" + puzzle.getRating() + "), темы: " + themes
                    + ". Найди лучший ход и проверь себя!";
        } else {
            title = "Chess puzzle";
            description = "Solve this tactical puzzle and test your calculation.";
        }

        String imageUrl = baseUrl + "/api/meta/image/puzzle/" + encodePath(puzzleId) + ".svg";
        String targetUrl = baseUrl + "/puzzle/" + encodePath(puzzleId);

        return htmlResponse(buildMetaHtml(title, description, imageUrl, targetUrl));
    }

    @GetMapping(value = "/image/invite/{inviteId}.svg", produces = "image/svg+xml")
    public ResponseEntity<String> inviteImage(@PathVariable String inviteId) {
        if (!inviteRepository.existsById(inviteId.toUpperCase())) {
            return svgResponse(ChessSvgRenderer.renderBoard(START_FEN, "Игра в шахматы", "Приглашение"));
        }

        return svgResponse(ChessSvgRenderer.renderBoard(START_FEN, "Приглашение в игру", "Стартовая позиция"));
    }

    @GetMapping(value = "/image/game/{gameId}.svg", produces = "image/svg+xml")
    public ResponseEntity<String> gameImage(@PathVariable String gameId) {
        Optional<Game> gameOpt = gameRepository.findById(gameId);
        if (gameOpt.isEmpty()) {
            return svgResponse(ChessSvgRenderer.renderBoard(START_FEN, "Chess Game", "Game preview"));
        }

        Game game = gameOpt.get();
        String fen = safe(game.getFenCurrent(), START_FEN);
        String title = safe(game.getPlayerWhite().getUsername(), "White") + " vs " + safe(game.getPlayerBlack().getUsername(), "Black");
        String subtitle = humanGameMode(inferSpeed(game.getTimeControl())) + " " + safe(game.getTimeControl(), "10+0");

        return svgResponse(ChessSvgRenderer.renderBoard(fen, title, subtitle));
    }

    @GetMapping(value = "/image/puzzle/{puzzleId}.svg", produces = "image/svg+xml")
    public ResponseEntity<String> puzzleImage(@PathVariable String puzzleId) {
        Optional<Puzzle> puzzleOpt = puzzleRepository.findById(puzzleId);
        if (puzzleOpt.isEmpty()) {
            return svgResponse(ChessSvgRenderer.renderBoard(START_FEN, "Puzzle", "Unknown puzzle"));
        }

        Puzzle puzzle = puzzleOpt.get();
        String subtitle = "Puzzle " + puzzle.getId() + " • " + puzzle.getRating();
        return svgResponse(ChessSvgRenderer.renderBoard(safe(puzzle.getFen(), START_FEN), "Найди лучший ход", subtitle));
    }

    private ResponseEntity<String> htmlResponse(String html) {
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                .body(html);
    }

    private ResponseEntity<String> svgResponse(String svg) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("image/svg+xml"))
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=300")
                .body(svg);
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

    private String humanGameMode(String mode) {
        if (mode == null || mode.isBlank()) return "Rapid";
        Map<String, String> map = Map.of(
                "bullet", "Bullet",
                "blitz", "Blitz",
                "rapid", "Rapid",
                "classic", "Classical",
                "custom", "Custom"
        );
        String normalized = mode.toLowerCase();
        return map.getOrDefault(normalized, capitalize(normalized));
    }

    private String humanResultReason(String reason) {
        if (reason == null || reason.isBlank()) return "";
        Map<String, String> map = Map.of(
                "checkmate", "checkmate",
                "resignation", "resignation",
                "timeout", "timeout",
                "stalemate", "stalemate",
                "agreement", "draw agreement",
                "abandonment", "abandonment"
        );
        return map.getOrDefault(reason.toLowerCase(), reason);
    }

    private String inferSpeed(String timeControl) {
        if (timeControl == null || !timeControl.contains("+")) {
            return "Rapid";
        }

        String[] parts = timeControl.split("\\+");
        int minutes;
        int increment;
        try {
            minutes = Integer.parseInt(parts[0]);
            increment = Integer.parseInt(parts[1]);
        } catch (Exception e) {
            return "Rapid";
        }

        int estimatedSeconds = minutes * 60 + increment * 40;
        if (estimatedSeconds <= 179) return "Bullet";
        if (estimatedSeconds <= 479) return "Blitz";
        if (estimatedSeconds <= 1499) return "Rapid";
        return "Classical";
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

    private static class ChessSvgRenderer {

        private static final String LIGHT = "#f0d9b5";
        private static final String DARK = "#b58863";
        private static final int BOARD_SIZE = 800;
        private static final int CELL = BOARD_SIZE / 8;

        private static final Map<Character, String> PIECES = Map.ofEntries(
                Map.entry('K', "♔"), Map.entry('Q', "♕"), Map.entry('R', "♖"), Map.entry('B', "♗"), Map.entry('N', "♘"), Map.entry('P', "♙"),
                Map.entry('k', "♚"), Map.entry('q', "♛"), Map.entry('r', "♜"), Map.entry('b', "♝"), Map.entry('n', "♞"), Map.entry('p', "♟")
        );

        static String renderBoard(String fen, String title, String subtitle) {
            String placement = fen != null && fen.contains(" ") ? fen.split(" ")[0] : fen;
            if (placement == null || placement.isBlank()) {
                placement = START_FEN.split(" ")[0];
            }

            StringBuilder svg = new StringBuilder();
            svg.append("<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='630' viewBox='0 0 1200 630'>");
            svg.append("<rect width='1200' height='630' fill='#111827' />");
            svg.append("<rect x='40' y='40' width='550' height='550' rx='16' fill='#1f2937' />");

            for (int rank = 0; rank < 8; rank++) {
                for (int file = 0; file < 8; file++) {
                    boolean light = (rank + file) % 2 == 0;
                    int x = 55 + file * 66;
                    int y = 55 + rank * 66;
                    svg.append("<rect x='").append(x).append("' y='").append(y)
                            .append("' width='66' height='66' fill='")
                            .append(light ? LIGHT : DARK)
                            .append("' />");
                }
            }

            String[] rows = placement.split("/");
            for (int rank = 0; rank < Math.min(rows.length, 8); rank++) {
                int file = 0;
                char[] chars = rows[rank].toCharArray();
                for (char c : chars) {
                    if (Character.isDigit(c)) {
                        file += Character.getNumericValue(c);
                        continue;
                    }
                    if (file >= 8) break;
                    String piece = PIECES.get(c);
                    if (piece != null) {
                        int x = 55 + file * 66 + 33;
                        int y = 55 + rank * 66 + 44;
                        svg.append("<text x='").append(x).append("' y='").append(y)
                                .append("' text-anchor='middle' font-size='44' font-family='Segoe UI Symbol, DejaVu Sans, Arial' fill='")
                                .append(Character.isUpperCase(c) ? "#f9fafb" : "#111827")
                                .append("'>").append(piece).append("</text>");
                    }
                    file++;
                }
            }

            svg.append("<text x='650' y='190' fill='#f9fafb' font-size='52' font-weight='700' font-family='Inter, Arial, sans-serif'>")
                    .append(escapeSvg(title))
                    .append("</text>");
            svg.append("<text x='650' y='250' fill='#d1d5db' font-size='32' font-family='Inter, Arial, sans-serif'>")
                    .append(escapeSvg(subtitle))
                    .append("</text>");
            svg.append("<text x='650' y='560' fill='#9ca3af' font-size='28' font-family='Inter, Arial, sans-serif'>onchess.online</text>");
            svg.append("</svg>");
            return svg.toString();
        }

        private static String escapeSvg(String value) {
            if (value == null) return "";
            return value
                    .replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                    .replace("\"", "&quot;")
                    .replace("'", "&#39;");
        }
    }
}
