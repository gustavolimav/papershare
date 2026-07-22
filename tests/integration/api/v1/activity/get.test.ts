import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/activity", () => {
  describe("Anonymous user", () => {
    test("Without session cookie", async () => {
      const response = await fetch("http://localhost:3000/api/v1/activity");

      expect(response.status).toBe(401);
    });
  });

  describe("Authenticated user", () => {
    test("A link-created event appears with the owner as actor", async () => {
      const { user, cookie } = await orchestrator.createUserSession();
      const document = await orchestrator.uploadDocument(cookie, {
        title: "Series A Deck.pdf",
      });
      await orchestrator.createShareLink(cookie, document.id, {
        label: "Investor link",
      });

      const response = await fetch("http://localhost:3000/api/v1/activity", {
        headers: { Cookie: cookie },
      });

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(responseBody.total).toBe(1);
      expect(responseBody.events).toHaveLength(1);
      expect(responseBody.events[0]).toMatchObject({
        event_type: "link_created",
        document_id: document.id,
        document_title: "Series A Deck.pdf",
        actor_name: user.username,
        actor_email: null,
        link_label: "Investor link",
        is_revisit: false,
      });
    });

    test("A view event appears with the viewer's name/email and reading detail", async () => {
      const { cookie } = await orchestrator.createUserSession();
      const document = await orchestrator.uploadDocument(cookie);
      const link = await orchestrator.createShareLink(cookie, document.id);

      await orchestrator.recordView(link.token, {
        viewer_name: "Elena Vasquez",
        viewer_email: "elena@example.com",
        time_on_page: 480,
        pages_viewed: 1,
      });

      const response = await fetch("http://localhost:3000/api/v1/activity", {
        headers: { Cookie: cookie },
      });

      const responseBody = await response.json();

      const viewEvent = responseBody.events.find(
        (event: { event_type: string }) => event.event_type === "view",
      );
      expect(viewEvent).toMatchObject({
        document_id: document.id,
        actor_name: "Elena Vasquez",
        actor_email: "elena@example.com",
        pages_viewed: 1,
        page_count: document.page_count,
        time_on_page: 480,
        is_revisit: false,
      });
    });

    test("A second view from the same viewer/link is flagged as a revisit", async () => {
      const { cookie } = await orchestrator.createUserSession();
      const document = await orchestrator.uploadDocument(cookie);
      const link = await orchestrator.createShareLink(cookie, document.id);

      const firstView = await orchestrator.recordView(link.token, {
        viewer_fingerprint: "fp-1",
        viewer_name: "Repeat Visitor",
      });
      await orchestrator.pushBackLinkViewCreatedAt(firstView.id, 60);

      await orchestrator.recordView(link.token, {
        viewer_fingerprint: "fp-1",
        viewer_name: "Repeat Visitor",
      });

      const response = await fetch("http://localhost:3000/api/v1/activity", {
        headers: { Cookie: cookie },
      });

      const responseBody = await response.json();

      const viewEvents = responseBody.events.filter(
        (event: { event_type: string }) => event.event_type === "view",
      );
      expect(viewEvents).toHaveLength(2);

      // ordered by created_at DESC: the most recent (revisit) comes first
      expect(viewEvents[0].is_revisit).toBe(true);
      expect(viewEvents[1].is_revisit).toBe(false);
    });

    test("Events are ordered by created_at DESC across both event types", async () => {
      const { cookie } = await orchestrator.createUserSession();
      const document = await orchestrator.uploadDocument(cookie);
      const link = await orchestrator.createShareLink(cookie, document.id, {
        label: "First link",
      });
      await orchestrator.recordView(link.token, { viewer_name: "Viewer" });

      const response = await fetch("http://localhost:3000/api/v1/activity", {
        headers: { Cookie: cookie },
      });

      const responseBody = await response.json();

      expect(responseBody.total).toBe(2);
      // the view happened after the link was created
      expect(responseBody.events[0].event_type).toBe("view");
      expect(responseBody.events[1].event_type).toBe("link_created");
    });

    test("Does not include another workspace's activity", async () => {
      const { cookie: ownerCookie } = await orchestrator.createUserSession();
      const { cookie: strangerCookie } = await orchestrator.createUserSession();

      const document = await orchestrator.uploadDocument(ownerCookie);
      await orchestrator.createShareLink(ownerCookie, document.id);

      const response = await fetch("http://localhost:3000/api/v1/activity", {
        headers: { Cookie: strangerCookie },
      });

      const responseBody = await response.json();

      expect(responseBody.total).toBe(0);
      expect(responseBody.events).toHaveLength(0);
    });

    test("Supports pagination via page and per_page", async () => {
      const { cookie } = await orchestrator.createUserSession();
      const document = await orchestrator.uploadDocument(cookie);
      await orchestrator.createShareLink(cookie, document.id, {
        label: "Link 1",
      });
      await orchestrator.createShareLink(cookie, document.id, {
        label: "Link 2",
      });
      await orchestrator.createShareLink(cookie, document.id, {
        label: "Link 3",
      });

      const response = await fetch(
        "http://localhost:3000/api/v1/activity?page=1&per_page=2",
        { headers: { Cookie: cookie } },
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(responseBody.total).toBe(3);
      expect(responseBody.events).toHaveLength(2);
      // ordered by created_at DESC: most recently created link first
      expect(responseBody.events[0].link_label).toBe("Link 3");
      expect(responseBody.events[1].link_label).toBe("Link 2");
    });
  });
});
