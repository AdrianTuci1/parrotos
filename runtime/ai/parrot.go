package ai

import (
	"context"
	"fmt"

	"github.com/google/jsonschema-go/jsonschema"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/rilldata/rill/runtime"
)

// ParrotAgentName is the name of the tool that grafts the Statsparrot "Parrot"
// chat agent onto the Rill runtime AI tool layer.
const ParrotAgentName = "parrot_agent"

type ParrotAgent struct {
	Runtime *runtime.Runtime
}

var _ Tool[*ParrotAgentArgs, *ParrotAgentResult] = (*ParrotAgent)(nil)

// ParrotAgentArgs mirrors the tools exposed by the Parrot (Sentry chat) agent in
// services/chat/index.js and routes them onto the Rill runtime AI tool layer
// (list_metrics_views / query_metrics_view / create_chart).
//
//	Action is the Parrot tool name being invoked.
//	Args are the Parrot tool's arguments.
//	Chart carries a create_chart-style request (chart_type + spec) for chart intents.
type ParrotAgentArgs struct {
	Action string         `json:"action"`
	Args   map[string]any `json:"args,omitempty"`
	Chart  map[string]any `json:"chart,omitempty"`
}

type ParrotAgentResult struct {
	Action       string            `json:"action"`
	Message      string            `json:"message"`
	Chart        *CreateChartResult `json:"chart,omitempty"`
	MetricsViews []map[string]any  `json:"metrics_views,omitempty"`
	Data         any               `json:"data,omitempty"`
}

func (t *ParrotAgent) Spec() *mcp.Tool {
	inputSchema, _ := jsonschema.For[*ParrotAgentArgs](nil)
	return &mcp.Tool{
		Name:        ParrotAgentName,
		Title:       "Parrot Agent",
		Description: "Graft of the Statsparrot Parrot chat agent onto the Rill runtime AI tool layer. Routes Parrot intents to list_metrics_views, query_metrics_view, create_chart and navigate so charts can render in chat.",
		Annotations: &mcp.ToolAnnotations{
			DestructiveHint: boolPtr(false),
			IdempotentHint:  true,
			OpenWorldHint:   boolPtr(false),
			ReadOnlyHint:    true,
		},
		Meta: map[string]any{
			"openai/toolInvocation/invoking": "Parrot agent routing...",
			"openai/toolInvocation/invoked":  "Parrot agent routed",
		},
		InputSchema: inputSchema,
	}
}

func (t *ParrotAgent) CheckAccess(ctx context.Context) (bool, error) {
	s := GetSession(ctx)
	return s.Claims().Can(runtime.UseAI), nil
}

func (t *ParrotAgent) Handler(ctx context.Context, args *ParrotAgentArgs) (*ParrotAgentResult, error) {
	if args == nil {
		return nil, fmt.Errorf("parrot_agent args are required")
	}

	s := GetSession(ctx)

	switch args.Action {
	case "list_metrics_views":
		var result ListMetricsViewsResult
		_, err := s.CallTool(ctx, RoleAssistant, ListMetricsViewsName, &result, &ListMetricsViewsArgs{})
		if err != nil {
			return nil, err
		}
		return &ParrotAgentResult{
			Action:       args.Action,
			Message:      fmt.Sprintf("Listed %d metrics views", len(result.MetricsViews)),
			MetricsViews: result.MetricsViews,
		}, nil

	case "show_widget", "create_chart", "run_analytics_query":
		// Chart/query intents are routed onto create_chart so the tool call is
		// recorded in the session and the chat renders a chart block from it.
		if len(args.Chart) == 0 {
			return nil, fmt.Errorf("parrot_agent chart intent requires a 'chart' request (chart_type + spec)")
		}
		var result CreateChartResult
		if _, err := s.CallTool(ctx, RoleAssistant, CreateChartName, &result, CreateChartArgs(args.Chart)); err != nil {
			return nil, err
		}
		return &ParrotAgentResult{
			Action:  args.Action,
			Message: result.Message,
			Chart:   &result,
		}, nil

	case "navigate_to":
		kind, _ := args.Args["kind"].(string)
		name, _ := args.Args["name"].(string)
		if kind == "" || name == "" {
			return nil, fmt.Errorf("navigate_to requires 'kind' and 'name'")
		}
		if _, err := s.CallTool(ctx, RoleAssistant, NavigateName, nil, &NavigateArgs{Kind: kind, Name: name}); err != nil {
			return nil, err
		}
		return &ParrotAgentResult{Action: args.Action, Message: "Navigating"}, nil

	case "open_integration_modal", "suggest_connectors", "trigger_harness", "check_harness", "update_bindings":
		// These intents are not Rill runtime operations; they are surfaced to the
		// Parrot UI layer. Return an informational result so the agent can continue.
		return &ParrotAgentResult{
			Action:  args.Action,
			Message: fmt.Sprintf("parrot_agent routed '%s' to the Statsparrot UI", args.Action),
		}, nil

	default:
		return &ParrotAgentResult{Action: args.Action, Message: "unknown parrot action"}, nil
	}
}
